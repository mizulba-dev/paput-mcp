#!/usr/bin/env node
// harvest の discovery / triage 集計を1回のスキャンで決定論的に出す。
// fs 読み取りと stdout(JSON) / stderr のみ。判断（本文読解・抽出・型付け・ユーザーへの質問）はエージェント側に残す。
// signal の意味の正本は design_doc #216（discovery 除外 signal）と SKILL.md。ここは判定を実行コードで固定する層。
//
// 使い方:
//   node harvest-scan.mjs [--claude-root <dir>] [--codex-root <dir>]
//                         [--processed <json-file>] [--sessions] [--limit N]
//                         [--user-messages] [--min-sessions N] [--top N]
//                         [--digest-cache <file>]
// 出力: { summary, clusters?, sessions? } の JSON を stdout へ。
//   --sessions を付けると in-scope の per-session 判定配列も出す（既定は summary のみ）。
//   --processed に paput_list_processed_sessions の JSON を渡すと処理済みを除いた backlog を集計する。
//   --user-messages で全実 user メッセージを正規化・クラスタ化した再発指示表 clusters を出す
//   （backfill sweep の機械前段。agent-driven セッションのメッセージは数えない）。
//   --digest-cache でファイル単位のスキャン結果を mtime+size キーで差分キャッシュする。

import {
  readdirSync,
  statSync,
  createReadStream,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

// ---- マーカー定義 ----
// 委譲テンプレート由来のマーカー（レビュー深刻度語彙・計画ファイル参照・静的検証制約）。先頭実メッセージにこれが
// あり real_user_msgs が少ないときだけ agent-driven 候補にする（safe-side: 人間の一発長文を誤判定しない）。
const DELEGATION_MARKERS = [
  /must-fix|should-fix|nit\b/i,
  /未コミット.*(diff|差分|レビュー)/,
  /レビュー(してください|し(た|て)|依頼)/,
  /計画ファイル|plan file|direction/i,
  /read-only|静的検証|指摘のみ/i,
];

// 注入ブロック（実 user テキストとして計上しない）。teammate / task 通知に加え、クライアントがプロンプト先頭へ
// 差し込む instruction / 環境ブロックを含める。素の contains 照合で先頭差し込みも全文混入も捕まえる。
const INJECTED_MARKERS = [
  '<teammate-message',
  'Another Claude session sent a message',
  '<task-notification',
  'task-notification',
  'This is an automated background-task event',
  '<system-reminder',
  '# AGENTS.md instructions for',
  '<INSTRUCTIONS>',
  '<user_instructions>',
  '<environment_context>',
  '<recommended_plugins>',
  '<command-name>', // slash-command echo（通常 user エントリで isMeta なし）を実 user テキストから除外
  '<command-message>',
  '<local-command-stdout>',
  '[Request interrupted by user', // ESC 中断でクライアントが user role に差し込む定型文
  '<turn_aborted>',
];

const CAPTURE_TOOL = 'paput_add_knowledge_candidates';
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// user_messages の上限（メモリ・キャッシュ肥大の抑制。クラスタリングには冒頭 400 字で十分）
const MAX_MSGS_PER_SESSION = 500;
const MAX_MSG_CHARS = 400;

function isInjectedText(t) {
  return INJECTED_MARKERS.some((m) => t.includes(m));
}
// capture ツールの実呼び出し判定。実データでは Claude の tool_use 名が MCP サーバー prefix 付き
// （mcp__<server>__paput_add_knowledge_candidates）で記録されるため、裸名の完全一致に加えて
// `__` 区切りの suffix 一致も受理する。Codex の function_call 名は裸名だが同じ判定で問題ない。
function isCaptureCall(name) {
  return (
    typeof name === 'string' &&
    (name === CAPTURE_TOOL || name.endsWith(`__${CAPTURE_TOOL}`))
  );
}
function hasDelegationMarker(t) {
  return DELEGATION_MARKERS.some((re) => re.test(t));
}
function extractUuid(s) {
  if (typeof s !== 'string') return null;
  const m = s.match(UUID_RE);
  return m ? m[0].toLowerCase() : null;
}

// ---- 引数 ----
function parseArgs(argv) {
  const o = {
    claudeRoot: join(homedir(), '.claude', 'projects'),
    codexRoot: join(homedir(), '.codex', 'sessions'),
    processed: null,
    sessions: false,
    limit: Infinity,
    userMessages: false,
    minSessions: 2,
    top: 100,
    digestCache: null,
  };
  const need = (i, name) => {
    if (i >= argv.length) {
      process.stderr.write(`harvest-scan: ${name} に値がありません\n`);
      process.exit(1);
    }
    return argv[i];
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--claude-root') o.claudeRoot = need((i += 1), a);
    else if (a === '--codex-root') o.codexRoot = need((i += 1), a);
    else if (a === '--processed') o.processed = need((i += 1), a);
    else if (a === '--sessions') o.sessions = true;
    else if (a === '--limit') {
      const v = Number(need((i += 1), a));
      if (!Number.isFinite(v) || v < 0) {
        process.stderr.write(
          `harvest-scan: --limit は非負の数値を要求します: ${argv[i]}\n`,
        );
        process.exit(1);
      }
      o.limit = v;
    } else if (a === '--user-messages') o.userMessages = true;
    else if (a === '--min-sessions') {
      const v = Number(need((i += 1), a));
      if (!Number.isInteger(v) || v < 1) {
        process.stderr.write(
          `harvest-scan: --min-sessions は 1 以上の整数を要求します: ${argv[i]}\n`,
        );
        process.exit(1);
      }
      o.minSessions = v;
    } else if (a === '--top') {
      const v = Number(need((i += 1), a));
      if (!Number.isInteger(v) || v < 1) {
        process.stderr.write(
          `harvest-scan: --top は 1 以上の整数を要求します: ${argv[i]}\n`,
        );
        process.exit(1);
      }
      o.top = v;
    } else if (a === '--digest-cache') o.digestCache = need((i += 1), a);
    else {
      process.stderr.write(`harvest-scan: 未知の引数: ${a}\n`);
      process.exit(1);
    }
  }
  return o;
}

// ---- ファイル探索（root 不在は空集合・例外を投げない） ----
function walkJsonl(root) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(root, e.name);
    if (e.isDirectory()) out.push(...walkJsonl(p));
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}

// ---- Claude 1ファイル走査 ----
// agent-* basename は本文を読まず即確定（負荷: 早期 break）。entrypoint は先頭行でなく最初に現れるエントリまで
// 走査し、mix（cli と sdk-cli の同居）は安全側で in_scope（human-cli 相当）にするため full scan する。
async function scanClaude(path) {
  const s = {
    source: 'claude',
    session_id: basename(path, '.jsonl'),
    path,
    origin: 'unknown',
    entrypoint: null,
    prompt_source: null,
    real_user_msgs: 0,
    first_user_message: null,
    user_messages: [],
    capture_signal: false,
    delegation_marker_in_first: false,
  };
  if (basename(path).startsWith('agent-')) {
    s.origin = 'agent-prefix';
    return s; // 本文読解を早期 break
  }

  let sawCli = false;
  let sawSdk = false;
  const rl = createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }

    if (typeof e.entrypoint === 'string') {
      if (s.entrypoint == null) s.entrypoint = e.entrypoint;
      if (e.entrypoint === 'cli') sawCli = true;
      else if (e.entrypoint === 'sdk-cli') sawSdk = true;
    }
    if (typeof e.promptSource === 'string') {
      if (s.prompt_source == null) s.prompt_source = e.promptSource;
      if (e.promptSource === 'sdk') sawSdk = true;
    }

    // capture signal: assistant の tool_use ブロックで CAPTURE_TOOL を実呼び出し（文字列 grep でない）
    if (e.type === 'assistant' && Array.isArray(e.message?.content)) {
      for (const b of e.message.content) {
        if (b?.type === 'tool_use' && isCaptureCall(b?.name))
          s.capture_signal = true;
      }
    }

    // 実 user テキスト（tool_result・注入ブロックを除外）
    if (e.type === 'user' && !e.isMeta) {
      const c = e.message?.content;
      let text = null;
      if (typeof c === 'string') text = c;
      else if (Array.isArray(c)) {
        if (c.some((b) => b?.type === 'tool_result')) text = null;
        else
          text =
            c
              .filter((b) => b?.type === 'text')
              .map((b) => b.text ?? '')
              .join('\n') || null;
      }
      if (text && text.trim() && !isInjectedText(text)) {
        s.real_user_msgs += 1;
        if (s.user_messages.length < MAX_MSGS_PER_SESSION)
          s.user_messages.push(text.trim().slice(0, MAX_MSG_CHARS));
        if (s.first_user_message == null) {
          s.first_user_message = text.trim().slice(0, 300);
          s.delegation_marker_in_first = hasDelegationMarker(text);
        }
      }
    }
  }

  // origin 判定（agent-prefix は上で確定済み）。cli が1つでもあれば mix でも安全側で human-cli（in_scope）。
  if (sawCli) s.origin = 'human-cli';
  else if (sawSdk) s.origin = 'headless-sdk';
  else s.origin = 'unknown'; // entrypoint 欠落・未知 → safe side（in_scope）
  return s;
}

// ---- Codex 1ファイル走査 ----
// 1行目 session_meta.payload.source で発生源を確定。exec / subagent は本文読解を早期 break（負荷）。
async function scanCodex(path) {
  const s = {
    source: 'codex',
    session_id: basename(path, '.jsonl'),
    path,
    origin: 'unknown',
    payload_source: null,
    codex_uuid: extractUuid(basename(path)),
    cwd: null,
    real_user_msgs: 0,
    first_user_message: null,
    user_messages: [],
    capture_signal: false,
    delegation_marker_in_first: false,
  };

  const stream = createReadStream(path);
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let firstLineSeen = false;
  for await (const line of rl) {
    if (!line) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }

    if (
      !firstLineSeen &&
      e.type === 'session_meta' &&
      e.payload &&
      typeof e.payload === 'object'
    ) {
      firstLineSeen = true;
      // source は string（cli / vscode / exec）または object（{subagent: {...}} = in-client subagent）。
      // 後者は payload_source を 'subagent' に正規化する（originator は subagent でも codex-tui になるため使わない・#192）。
      const src = e.payload.source;
      if (typeof src === 'string') s.payload_source = src;
      else if (src && typeof src === 'object' && 'subagent' in src)
        s.payload_source = 'subagent';
      if (typeof e.payload.cwd === 'string') s.cwd = e.payload.cwd;
      if (typeof e.payload.session_id === 'string') {
        const u = extractUuid(e.payload.session_id);
        if (u) s.codex_uuid = u;
      }
      // exec / subagent は agent-driven 確定 → 本文読解を早期 break
      if (
        s.payload_source === 'exec' ||
        /subagent/.test(s.payload_source ?? '')
      ) {
        break;
      }
    }

    // capture signal: function_call エントリ形状で name 一致（文字列 grep でない）
    if (e.type === 'response_item' && e.payload?.type === 'function_call') {
      if (isCaptureCall(e.payload?.name)) s.capture_signal = true;
    }
    // 実 user テキスト
    if (
      e.type === 'response_item' &&
      e.payload?.type === 'message' &&
      e.payload?.role === 'user'
    ) {
      const c = e.payload.content;
      let text = null;
      if (Array.isArray(c)) {
        text =
          c
            .filter((b) => b?.type === 'input_text' || b?.type === 'text')
            .map((b) => b.text ?? '')
            .join('\n') || null;
      } else if (typeof c === 'string') text = c;
      if (text && text.trim() && !isInjectedText(text)) {
        s.real_user_msgs += 1;
        if (s.user_messages.length < MAX_MSGS_PER_SESSION)
          s.user_messages.push(text.trim().slice(0, MAX_MSG_CHARS));
        if (s.first_user_message == null) {
          s.first_user_message = text.trim().slice(0, 300);
          s.delegation_marker_in_first = hasDelegationMarker(text);
        }
      }
    }
  }
  rl.close();
  stream.destroy();

  if (s.payload_source === 'exec') s.origin = 'codex-exec';
  else if (/subagent/.test(s.payload_source ?? '')) s.origin = 'codex-subagent';
  else if (s.payload_source === 'cli') s.origin = 'codex-cli';
  else if (s.payload_source === 'vscode') s.origin = 'codex-vscode';
  else s.origin = 'unknown';
  return s;
}

// ---- scope 判定 ----
const OUT_OF_SCOPE = new Set([
  'agent-prefix',
  'headless-sdk',
  'codex-exec',
  'codex-subagent',
]);
function decorate(s) {
  s.in_scope = !OUT_OF_SCOPE.has(s.origin);
  s.scope_reason = s.in_scope ? 'in' : `out:${s.origin}`;
  if (s.source === 'claude') {
    const m = s.path.match(/\/projects\/([^/]+)\//);
    s.project_hint = m ? m[1] : null;
  } else {
    s.project_hint = s.cwd ?? null;
  }
  try {
    const mt = statSync(s.path).mtime;
    // 下流（候補登録・処理済み mark・委譲入力）と SKILL.md Step 3 が要求する契約フィールド名に揃える。
    s.source_session_updated_at = mt.toISOString();
    s.month = s.source_session_updated_at.slice(0, 7);
  } catch {
    s.source_session_updated_at = null;
    s.month = null;
  }
  // 委譲ヒューリスティック（フォールバック）: real_user_msgs ≤ 2 かつ 先頭実メッセージに委譲マーカー。
  s.likely_agent_driven = s.real_user_msgs <= 2 && s.delegation_marker_in_first;
  if (!s.in_scope) s.triage = 'out-of-scope';
  else if (s.likely_agent_driven) s.triage = 'p3-agent-driven';
  else if (s.capture_signal) s.triage = 'p2-interactive-captured';
  else s.triage = 'p1-interactive-fresh';
  return s;
}

// ---- 処理済みマーカー（Codex は rollout-basename と bare-UUID の両形式で照合） ----
function buildProcessed(raw) {
  const arr = Array.isArray(raw) ? raw : (raw.sessions ?? raw.processed ?? []);
  const claudeRaw = new Set();
  const codexRaw = new Set();
  const codexUuids = new Set();
  for (const x of arr) {
    const id = typeof x === 'string' ? x : x?.session_id;
    if (typeof id !== 'string' || id === '') continue;
    const source = typeof x === 'object' ? x?.source : null;
    if (source === 'claude') {
      claudeRaw.add(id);
    } else if (source === 'codex') {
      codexRaw.add(id);
      const u = extractUuid(id);
      if (u) codexUuids.add(u);
    } else {
      // source 不明: 両系へ登録し、UUID を抽出できれば Codex 側にも回す（過剰除外を避け、取りこぼしを塞ぐ）。
      claudeRaw.add(id);
      codexRaw.add(id);
      const u = extractUuid(id);
      if (u) codexUuids.add(u);
    }
  }
  return { claudeRaw, codexRaw, codexUuids };
}

function isProcessed(s, p) {
  if (!p) return false;
  if (s.source === 'claude') return p.claudeRaw.has(s.session_id);
  // Codex: basename 一致 or bare-UUID 一致（どちらの形式のマーカーでも除外）
  if (p.codexRaw.has(s.session_id)) return true;
  const u = s.codex_uuid ?? extractUuid(s.session_id);
  return u != null && p.codexUuids.has(u);
}

// ---- 再発指示クラスタリング（--user-messages） ----
// ユーザーは同じ指示をほぼ同文で打つ（字面ベースで実用的に拾える）前提の機械前段。
// 可変部（数値・パス・URL・コード・画像）を畳んで完全一致でグループ化し、3-gram Jaccard で近接重複をマージする。
// 意味的な言い換えの統合は担わない — それは LLM / サーバー側 pgvector の仕事。
function normalizeMessage(t) {
  return t
    .replace(/```[\s\S]*?```/g, ' <code> ')
    .replace(/<\/?image[^>]*>/gi, ' ')
    .replace(/\[image \d+\]/gi, ' ')
    .replace(/https?:\/\/[^\s>"')]+/g, ' <url> ')
    .replace(/(?:~\/|\/)[\w.@-]+(?:\/[\w.@-]+)+/g, ' <path> ')
    .replace(/[0-9]+/g, '#')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MSG_CHARS);
}

// プレースホルダ・記号・空白を除いた実質文字数（挨拶・画像のみ等のノイズ除外に使う）
const NOISE_STRIP_RE = /<(code|url|path)>|[#\s[\]().,、。!?！？:：;；\-—…]/g;

function shingles(t, n = 3) {
  const set = new Set();
  for (let i = 0; i <= t.length - n; i += 1) set.add(t.slice(i, i + n));
  return set;
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const x of small) if (large.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

// 再発は「セッション横断」で数える（単一セッション内の連打はリトライノイズであって再発ではない）。
// agent-driven（out-of-scope / p3）のメッセージは委譲テンプレの逐語繰り返しで
// クラスタを偽装するため決して数えない（SKILL.md の backfill 規則の実装）。
function clusterUserMessages(sessions, { minSessions = 2 } = {}) {
  const groups = new Map(); // norm -> group
  for (const s of sessions) {
    if (!s.in_scope || s.likely_agent_driven) continue;
    for (const raw of s.user_messages ?? []) {
      const norm = normalizeMessage(raw);
      if (norm.replace(NOISE_STRIP_RE, '').length < 4) continue;
      let g = groups.get(norm);
      if (!g) {
        g = {
          norm,
          msg_count: 0,
          session_ids: new Set(),
          projects: new Map(),
          months: new Set(),
          examples: [],
        };
        groups.set(norm, g);
      }
      g.msg_count += 1;
      g.session_ids.add(s.session_id);
      if (s.project_hint)
        g.projects.set(
          s.project_hint,
          (g.projects.get(s.project_hint) ?? 0) + 1,
        );
      if (s.month) g.months.add(s.month);
      const ex = raw.trim().slice(0, 200);
      if (g.examples.length < 3 && !g.examples.includes(ex))
        g.examples.push(ex);
    }
  }

  // 近接重複マージ: 転置索引で共有 shingle ≥3 の組だけ Jaccard 計算（df>200 の頻出 shingle は候補生成から除外）
  const list = [...groups.values()];
  const sh = list.map((g) => shingles(g.norm));
  const posting = new Map(); // shingle -> group index[]
  sh.forEach((set, i) => {
    for (const x of set) {
      let p = posting.get(x);
      if (!p) posting.set(x, (p = []));
      p.push(i);
    }
  });
  const parent = list.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  for (let i = 0; i < list.length; i += 1) {
    const tally = new Map();
    for (const x of sh[i]) {
      const p = posting.get(x);
      if (!p || p.length > 200) continue;
      for (const j of p) if (j < i) tally.set(j, (tally.get(j) ?? 0) + 1);
    }
    for (const [j, shared] of tally) {
      if (shared < 3) continue;
      if (jaccard(sh[i], sh[j]) < 0.5) continue;
      const ri = find(i);
      const rj = find(j);
      if (ri !== rj) parent[ri] = rj;
    }
  }

  const merged = new Map(); // root -> group[]
  list.forEach((g, i) => {
    const r = find(i);
    let m = merged.get(r);
    if (!m) merged.set(r, (m = []));
    m.push(g);
  });

  const clusters = [];
  for (const subs of merged.values()) {
    subs.sort((a, b) => b.msg_count - a.msg_count);
    const sessionIds = new Set();
    const months = new Set();
    const projects = new Map();
    const variants = [];
    let msgCount = 0;
    for (const g of subs) {
      msgCount += g.msg_count;
      for (const id of g.session_ids) sessionIds.add(id);
      for (const m of g.months) months.add(m);
      for (const [k, v] of g.projects)
        projects.set(k, (projects.get(k) ?? 0) + v);
      for (const ex of g.examples)
        if (variants.length < 4 && !variants.includes(ex)) variants.push(ex);
    }
    if (sessionIds.size < minSessions) continue;
    clusters.push({
      representative: variants[0] ?? '',
      variants: variants.slice(1),
      msg_count: msgCount,
      session_count: sessionIds.size,
      projects: Object.fromEntries(
        [...projects.entries()].sort((a, b) => b[1] - a[1]),
      ),
      months: [...months].sort(),
      session_ids: [...sessionIds].slice(0, 10),
    });
  }
  clusters.sort(
    (a, b) => b.session_count - a.session_count || b.msg_count - a.msg_count,
  );
  return clusters;
}

// ---- 差分キャッシュ（--digest-cache） ----
// mtime+size 一致でスキャン結果を再利用する fail-open キャッシュ。scan フィールドを変えたら SCAN_VERSION を上げる
// （版不一致は全捨てで自己無効化）。decorate は保存しない — mtime 由来フィールドは毎回計算し直す。
const SCAN_VERSION = 2;

function loadDigestCache(path) {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    if (
      raw?.version === SCAN_VERSION &&
      raw.entries != null &&
      typeof raw.entries === 'object'
    )
      return { version: SCAN_VERSION, entries: raw.entries };
  } catch (err) {
    if (err?.code !== 'ENOENT')
      process.stderr.write(
        `harvest-scan: --digest-cache 読み込み失敗（空キャッシュで続行）: ${err.message}\n`,
      );
  }
  return { version: SCAN_VERSION, entries: {} };
}

// ---- 集計 ----
function summarize(sessions) {
  const inc = (o, k) => {
    o[k] = (o[k] ?? 0) + 1;
  };
  const sum = {
    total: sessions.length,
    by_source: {},
    by_origin: {},
    scope: { in: 0, out: 0 },
    triage: {},
    buckets: {},
  };
  for (const s of sessions) {
    inc(sum.by_source, s.source);
    inc(sum.by_origin, s.origin);
    sum.scope[s.in_scope ? 'in' : 'out'] += 1;
    inc(sum.triage, s.triage);
    if (s.in_scope) {
      const key = `${s.project_hint ?? '?'} | ${s.month ?? '?'} | cap=${s.capture_signal}`;
      inc(sum.buckets, key);
    }
  }
  return sum;
}

// ---- main ----
async function main() {
  const o = parseArgs(process.argv.slice(2));
  let processed = null;
  if (o.processed) {
    try {
      processed = buildProcessed(JSON.parse(readFileSync(o.processed, 'utf8')));
    } catch (err) {
      // fail-open だが警告必須（マーカー無しで続行）
      process.stderr.write(
        `harvest-scan: --processed 読み込み失敗（マーカー無しで続行）: ${err.message}\n`,
      );
      processed = null;
    }
  }

  const claudeFiles = walkJsonl(o.claudeRoot);
  const codexFiles = walkJsonl(o.codexRoot);

  const cache = o.digestCache ? loadDigestCache(o.digestCache) : null;
  const nextEntries = {};
  const cacheStats = { hits: 0, misses: 0 };
  async function scanFile(kind, path) {
    const scanner = kind === 'claude' ? scanClaude : scanCodex;
    if (!cache) return scanner(path);
    let st = null;
    try {
      st = statSync(path);
    } catch {
      return scanner(path);
    }
    const prev = cache.entries[path];
    if (prev && prev.mtimeMs === st.mtimeMs && prev.size === st.size) {
      cacheStats.hits += 1;
      nextEntries[path] = prev;
      return structuredClone(prev.scan);
    }
    cacheStats.misses += 1;
    const scan = await scanner(path);
    nextEntries[path] = {
      mtimeMs: st.mtimeMs,
      size: st.size,
      scan: structuredClone(scan),
    };
    return scan;
  }

  const sessions = [];
  for (const f of claudeFiles)
    sessions.push(decorate(await scanFile('claude', f)));
  for (const f of codexFiles)
    sessions.push(decorate(await scanFile('codex', f)));

  if (cache) {
    // 現存ファイルのみ書き戻す（削除済みエントリの併せ掃除）。書けなくても集計は返す。
    try {
      writeFileSync(
        o.digestCache,
        JSON.stringify({ version: SCAN_VERSION, entries: nextEntries }),
      );
    } catch (err) {
      process.stderr.write(
        `harvest-scan: --digest-cache 書き込み失敗（キャッシュ無しで続行）: ${err.message}\n`,
      );
    }
  }

  let backlog = sessions;
  if (processed) backlog = sessions.filter((s) => !isProcessed(s, processed));

  const out = { summary: summarize(backlog) };
  out.summary.processed_filtered = processed
    ? sessions.length - backlog.length
    : null;
  out.summary.digest_cache = cache ? cacheStats : null;
  if (o.userMessages) {
    // 切り詰めは黙って行わない: 全体数を summary に出し、上限は --top で動かせる
    const all = clusterUserMessages(backlog, { minSessions: o.minSessions });
    out.summary.clusters_total = all.length;
    out.summary.clusters_truncated = all.length > o.top;
    out.clusters = all.slice(0, o.top);
  }
  if (o.sessions) {
    out.sessions = backlog
      .filter((s) => s.in_scope) // out-of-scope は本文を読まないので既定で省く
      .sort((a, b) =>
        (b.source_session_updated_at ?? '').localeCompare(
          a.source_session_updated_at ?? '',
        ),
      )
      .slice(0, o.limit === Infinity ? undefined : o.limit)
      .map(({ user_messages, ...rest }) => rest); // 本文相当の肥大化を防ぐ（clusters 側で参照する）
  }
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

// 直接実行時のみ CLI として動く。import 時は判定関数を副作用なしで公開する（テストの直接検証用）。
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((e) => {
    process.stderr.write(`harvest-scan: ${e.stack || e}\n`);
    process.exit(1);
  });
}

export {
  scanClaude,
  scanCodex,
  decorate,
  buildProcessed,
  isProcessed,
  summarize,
  normalizeMessage,
  clusterUserMessages,
};
