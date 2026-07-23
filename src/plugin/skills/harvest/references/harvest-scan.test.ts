import { execFile } from 'node:child_process';
import {
  appendFileSync,
  cpSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// signal 定義の正本は design_doc #216（discovery 除外 signal）。ここは判定の反証（対照実装なら落ちる識別）を
// 含めてスクリプト実装が仕様どおりであることを機械検証する。
// @ts-expect-error .mjs は型定義を持たない（type-check は test を除外、実行は vitest が解決する）
import {
  scanClaude,
  scanCodex,
  decorate,
  buildProcessed,
  isProcessed,
  normalizeMessage,
  clusterUserMessages,
} from './harvest-scan.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const scriptPath = join(here, 'harvest-scan.mjs');
const claudeRoot = join(here, '__fixtures__', 'claude');
const codexRoot = join(here, '__fixtures__', 'codex');

const claudeFile = (uuid: string) => join(claudeRoot, `${uuid}.jsonl`);
const codexFile = (name: string) => join(codexRoot, `${name}.jsonl`);

// Claude fixtures
const CL_AGENT = 'agent-2f0c1d00-0000-0000-0000-000000000000';
const CL_HUMAN = 'aaaaaaaa-0000-0000-0000-000000000001';
const CL_SDK_3RD = 'aaaaaaaa-0000-0000-0000-000000000002';
const CL_MISSING = 'aaaaaaaa-0000-0000-0000-000000000003';
const CL_SDK_HUMANLIKE = 'aaaaaaaa-0000-0000-0000-000000000004'; // 故意ずれ(1)
const CL_SDK_LATE = 'aaaaaaaa-0000-0000-0000-000000000005'; // 故意ずれ(2)
const CL_MISSING_DELEG = 'aaaaaaaa-0000-0000-0000-000000000006'; // 故意ずれ(3)
const CL_DELEG_3MSG = 'aaaaaaaa-0000-0000-0000-000000000007';
const CL_CAPTURE = 'aaaaaaaa-0000-0000-0000-000000000008';
const CL_CMD_ECHO = 'aaaaaaaa-0000-0000-0000-0000000000a0';
const CL_MIX = 'aaaaaaaa-0000-0000-0000-0000000000a1';
const CL_CAPTURE_PREFIXED = 'aaaaaaaa-0000-0000-0000-0000000000a2';
const CL_REPEAT_A = 'aaaaaaaa-0000-0000-0000-0000000000a3';
const CL_REPEAT_B = 'aaaaaaaa-0000-0000-0000-0000000000a4';

// Codex fixtures
const CX_CLI =
  'rollout-2026-01-01T00-00-00-bbbbbbbb-0000-0000-0000-000000000001';
const CX_EXEC =
  'rollout-2026-01-01T00-00-00-bbbbbbbb-0000-0000-0000-000000000002';
const CX_SUBAGENT =
  'rollout-2026-01-01T00-00-00-bbbbbbbb-0000-0000-0000-000000000003';
const CX_VSCODE =
  'rollout-2026-01-01T00-00-00-bbbbbbbb-0000-0000-0000-000000000004';
const CX_UNKNOWN =
  'rollout-2026-01-01T00-00-00-bbbbbbbb-0000-0000-0000-000000000005';
const CX_AGENTS_INJECT =
  'rollout-2026-01-01T00-00-00-bbbbbbbb-0000-0000-0000-000000000006';
const CX_INJECT_ONLY =
  'rollout-2026-01-01T00-00-00-bbbbbbbb-0000-0000-0000-000000000007';
const CX_CAPTURE =
  'rollout-2026-01-01T00-00-00-bbbbbbbb-0000-0000-0000-0000000000b8';

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve) => {
    execFile('node', [scriptPath, ...args], (err, stdout, stderr) => {
      const code =
        err && typeof (err as { code?: number }).code === 'number'
          ? (err as { code: number }).code
          : 0;
      resolve({ code, stdout, stderr });
    });
  });
}

async function scanClaudeDecorated(uuid: string) {
  return decorate(await scanClaude(claudeFile(uuid)));
}
async function scanCodexDecorated(name: string) {
  return decorate(await scanCodex(codexFile(name)));
}

// ==================== EC-HS-1: CLI 契約（引数・exit code） ====================
describe('EC-HS-1 CLI 契約', () => {
  it('未知引数は stderr 診断 + exit 1（握り潰さない）', async () => {
    const r = await runCli(['--bogus']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('未知の引数');
  });

  it('値が欠けた引数は exit 1', async () => {
    const r = await runCli(['--claude-root']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('値がありません');
  });

  it('--limit の非数値は exit 1', async () => {
    const r = await runCli(['--limit', 'abc']);
    expect(r.code).toBe(1);
  });

  it('存在しない root は空集合として exit 0（例外を投げない）', async () => {
    const r = await runCli([
      '--claude-root',
      '/no/such/dir/xyz',
      '--codex-root',
      '/no/such/dir/zzz',
    ]);
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.summary.total).toBe(0);
  });

  it('壊れた --processed JSON は stderr 警告 + マーカー無しで続行（fail-open, exit 0）', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hs-'));
    const broken = join(dir, 'broken.json');
    writeFileSync(broken, '{ this is not json');
    const r = await runCli([
      '--claude-root',
      claudeRoot,
      '--codex-root',
      codexRoot,
      '--processed',
      broken,
    ]);
    expect(r.code).toBe(0);
    expect(r.stderr).toContain('読み込み失敗');
    const out = JSON.parse(r.stdout);
    // マーカー無しで続行するので processed_filtered は null、集計は全件走る
    expect(out.summary.processed_filtered).toBeNull();
    expect(out.summary.total).toBeGreaterThan(0);
  });
});

// ==================== EC-HS-2: 発生源判定 signal（scope in/out） ====================
describe('EC-HS-2 発生源判定', () => {
  it('Claude: agent-* basename は本文を読まず agent-prefix（out）', async () => {
    const s = await scanClaudeDecorated(CL_AGENT);
    expect(s.origin).toBe('agent-prefix');
    expect(s.in_scope).toBe(false);
    // basename 判定なので本文（entrypoint cli, user message）は読まない
    expect(s.real_user_msgs).toBe(0);
  });

  it('Claude: entrypoint cli は human-cli（in）', async () => {
    const s = await scanClaudeDecorated(CL_HUMAN);
    expect(s.origin).toBe('human-cli');
    expect(s.in_scope).toBe(true);
  });

  it('Claude: entrypoint 欠落は unknown（in・safe-side）', async () => {
    const s = await scanClaudeDecorated(CL_MISSING);
    expect(s.origin).toBe('unknown');
    expect(s.in_scope).toBe(true);
  });

  it('Codex: cli/vscode は in、exec/subagent は out、未知 source は in', async () => {
    expect((await scanCodexDecorated(CX_CLI)).in_scope).toBe(true);
    expect((await scanCodexDecorated(CX_VSCODE)).in_scope).toBe(true);
    expect((await scanCodexDecorated(CX_UNKNOWN)).in_scope).toBe(true);
    expect((await scanCodexDecorated(CX_EXEC)).origin).toBe('codex-exec');
    expect((await scanCodexDecorated(CX_EXEC)).in_scope).toBe(false);
    const sub = await scanCodexDecorated(CX_SUBAGENT);
    expect(sub.origin).toBe('codex-subagent');
    expect(sub.in_scope).toBe(false);
  });

  // 反証: 内容ヒューリスティックで判定していない（検体1）
  it('故意ずれ(1): 内容は人間依頼そのものでも entrypoint sdk-cli なら out（フィールド判定の証拠）', async () => {
    const s = await scanClaudeDecorated(CL_SDK_HUMANLIKE);
    // 内容で判定する対照実装なら「人間依頼」に見えるため in_scope としてしまい fail する
    expect(s.origin).toBe('headless-sdk');
    expect(s.in_scope).toBe(false);
  });

  // 反証: 先頭行のみ走査していない（検体2）
  it('故意ずれ(2): entrypoint が最初の user エントリ（11行目）にだけ有る sdk-cli も out に落とす', async () => {
    const s = await scanClaudeDecorated(CL_SDK_LATE);
    // 先頭行だけ読む対照実装は entrypoint を取りこぼし in_scope に残して fail する
    expect(s.entrypoint).toBe('sdk-cli');
    expect(s.origin).toBe('headless-sdk');
    expect(s.in_scope).toBe(false);
  });

  // safe-side（検体3）
  it('故意ずれ(3): entrypoint 欠落 + 委譲マーカーは scope 内に残す（safe-side）', async () => {
    const s = await scanClaudeDecorated(CL_MISSING_DELEG);
    expect(s.in_scope).toBe(true);
    // 委譲マーカーで triage は p3 になるが、読む対象からは外さない
    expect(s.likely_agent_driven).toBe(true);
  });
});

// ==================== EC-HS-2 負荷特性: out-of-scope の早期 break ====================
describe('EC-HS-2 早期 break（out-of-scope は本文を読まない）', () => {
  it('Codex exec は 1 行目で確定し本文（user メッセージ・capture 呼び出し）を読まない', async () => {
    const s = await scanCodex(codexFile(CX_EXEC));
    // 本文を読んでいれば real_user_msgs=1 / capture_signal=true になるはず。早期 break でどちらも初期値のまま。
    expect(s.real_user_msgs).toBe(0);
    expect(s.capture_signal).toBe(false);
  });

  it('Codex subagent も本文を読まない', async () => {
    const s = await scanCodex(codexFile(CX_SUBAGENT));
    expect(s.real_user_msgs).toBe(0);
  });

  it('Claude agent-* も本文を読まない', async () => {
    const s = await scanClaude(claudeFile(CL_AGENT));
    expect(s.real_user_msgs).toBe(0);
    expect(s.entrypoint).toBeNull();
  });
});

// ==================== EC-HS-3: 処理済みマーカー照合（Codex 多形式） ====================
describe('EC-HS-3 マーカー多形式照合', () => {
  function processedFile(
    entries: Array<{ source?: string; session_id: string }>,
  ): string {
    const dir = mkdtempSync(join(tmpdir(), 'hs-'));
    const p = join(dir, 'processed.json');
    writeFileSync(p, JSON.stringify({ sessions: entries }));
    return p;
  }

  async function backlogTotalWith(processed: string): Promise<number> {
    const r = await runCli([
      '--claude-root',
      claudeRoot,
      '--codex-root',
      codexRoot,
      '--processed',
      processed,
    ]);
    expect(r.code).toBe(0);
    return JSON.parse(r.stdout).summary.total;
  }

  it('ベースライン total を取得（--processed 無し）', async () => {
    const r = await runCli([
      '--claude-root',
      claudeRoot,
      '--codex-root',
      codexRoot,
    ]);
    expect(JSON.parse(r.stdout).summary.total).toBeGreaterThan(0);
  });

  it('Codex マーカーが rollout-basename 形式でも除外される', async () => {
    const base = JSON.parse(
      (await runCli(['--claude-root', claudeRoot, '--codex-root', codexRoot]))
        .stdout,
    ).summary.total;
    const p = processedFile([{ source: 'codex', session_id: CX_CLI }]);
    expect(await backlogTotalWith(p)).toBe(base - 1);
  });

  // 反証: 素の session_id 完全一致だけの対照は bare-UUID マーカーで rollout を除外できず fail する
  it('Codex マーカーが bare-UUID 形式でも rollout ファイルを除外する（PoC の穴の反証）', async () => {
    const base = JSON.parse(
      (await runCli(['--claude-root', claudeRoot, '--codex-root', codexRoot]))
        .stdout,
    ).summary.total;
    const bareUuid = 'bbbbbbbb-0000-0000-0000-000000000001';
    const p = processedFile([{ source: 'codex', session_id: bareUuid }]);
    // 対照（basename 完全一致のみ）だと rollout-...-bbbbbbbb-...0001 は bareUuid と一致せず除外されない
    expect(await backlogTotalWith(p)).toBe(base - 1);
  });

  it('Claude マーカーは UUID basename 一致で除外する', async () => {
    const base = JSON.parse(
      (await runCli(['--claude-root', claudeRoot, '--codex-root', codexRoot]))
        .stdout,
    ).summary.total;
    const p = processedFile([{ source: 'claude', session_id: CL_HUMAN }]);
    expect(await backlogTotalWith(p)).toBe(base - 1);
  });

  it('isProcessed 単体: bare-UUID / rollout-basename 双方の Codex マーカーで一致する', () => {
    const bare = buildProcessed({
      sessions: [
        { source: 'codex', session_id: 'bbbbbbbb-0000-0000-0000-000000000001' },
      ],
    });
    const rollout = buildProcessed({
      sessions: [{ source: 'codex', session_id: CX_CLI }],
    });
    const session = {
      source: 'codex',
      session_id: CX_CLI,
      codex_uuid: 'bbbbbbbb-0000-0000-0000-000000000001',
    };
    expect(isProcessed(session, bare)).toBe(true);
    expect(isProcessed(session, rollout)).toBe(true);
  });
});

// ==================== EC-HS-4: 注入ブロック除外と委譲 signal ====================
describe('EC-HS-4 注入除外・委譲判定', () => {
  // 反証: 注入除外を外した対照は first_user_message が AGENTS.md 注入文になり fail する
  it('先頭の AGENTS.md 注入は実 user テキストに数えず、最初の人間メッセージを first にする', async () => {
    const s = await scanCodex(codexFile(CX_AGENTS_INJECT));
    expect(s.first_user_message).toBe('検索機能のバグを直したい');
    expect(s.real_user_msgs).toBe(1);
  });

  it('注入ブロックだけで人間メッセージゼロなら real_user_msgs=0 / first は null', async () => {
    const s = await scanCodex(codexFile(CX_INJECT_ONLY));
    expect(s.real_user_msgs).toBe(0);
    expect(s.first_user_message).toBeNull();
  });

  // 反証: real_user_msgs 上限を外した対照は長文人間依頼を agent-driven に落とし fail する
  it('委譲マーカーがあっても real_user_msgs=3 なら likely_agent_driven=false（safe-side）', async () => {
    const s = await scanClaudeDecorated(CL_DELEG_3MSG);
    expect(s.real_user_msgs).toBe(3);
    expect(s.delegation_marker_in_first).toBe(true);
    expect(s.likely_agent_driven).toBe(false);
  });

  it('委譲マーカー + real_user_msgs≤2 は likely_agent_driven=true（ただし in_scope）', async () => {
    const s = await scanClaudeDecorated(CL_MISSING_DELEG);
    expect(s.likely_agent_driven).toBe(true);
    expect(s.in_scope).toBe(true);
  });

  it('capture 実呼び出し（tool_use）を検出し triage を p2 にする', async () => {
    const s = await scanClaudeDecorated(CL_CAPTURE);
    expect(s.capture_signal).toBe(true);
    expect(s.triage).toBe('p2-interactive-captured');
  });

  // 反証: 裸名の完全一致だけの対照は、実データ形状（MCP prefix 付き）の capture を検出できず fail する
  it('Claude の MCP prefix 付き tool_use 名（mcp__…__paput_add_knowledge_candidates）も capture として検出し p2', async () => {
    const s = await scanClaudeDecorated(CL_CAPTURE_PREFIXED);
    expect(s.capture_signal).toBe(true);
    expect(s.triage).toBe('p2-interactive-captured');
  });

  // 反証: <command-name> を注入除外しない対照は echo を実 user に数え first_user_message を汚す
  it('slash-command echo（<command-name>）は実 user に数えず、次の人間メッセージを first にする', async () => {
    const s = await scanClaudeDecorated(CL_CMD_ECHO);
    expect(s.real_user_msgs).toBe(1);
    expect(s.first_user_message).toBe('実際の質問です');
  });

  // should-fix 4: Codex in-scope セッションの function_call capture 検出（early break に阻まれない経路）
  it('Codex codex-cli の function_call capture を検出し p2', async () => {
    const s = await scanCodexDecorated(CX_CAPTURE);
    expect(s.in_scope).toBe(true);
    expect(s.capture_signal).toBe(true);
    expect(s.triage).toBe('p2-interactive-captured');
  });
});

// ==================== EC-HS-2 safe-side: cli↔sdk-cli 混在 ====================
describe('EC-HS-2 混在は安全側', () => {
  // 反証: sdk 優先の対照は mix を headless-sdk(out) に落として fail する
  it('cli と sdk-cli が同居するファイルは human-cli, in_scope（cli 優先の safe-side）', async () => {
    const s = await scanClaudeDecorated(CL_MIX);
    expect(s.origin).toBe('human-cli');
    expect(s.in_scope).toBe(true);
  });
});

// ==================== EC-HS-3 補: source 不明マーカー / EC-HS-5 契約フィールド名 ====================
describe('EC-HS-3 source 不明マーカー分岐', () => {
  it('source 不明のマーカーは Claude/Codex 両系へ効き、UUID 抽出で Codex rollout も除外する', () => {
    const p = buildProcessed({
      sessions: [{ session_id: 'bbbbbbbb-0000-0000-0000-000000000001' }],
    });
    const codexSession = {
      source: 'codex',
      session_id: CX_CLI,
      codex_uuid: 'bbbbbbbb-0000-0000-0000-000000000001',
    };
    const claudeSession = { source: 'claude', session_id: CL_HUMAN };
    expect(isProcessed(codexSession, p)).toBe(true);
    expect(isProcessed(claudeSession, p)).toBe(false); // 別 UUID の Claude は残る
  });
});

// ==================== EC-HS-6: user_messages 収集と中断マーカー除外 ====================
describe('EC-HS-6 user_messages 収集', () => {
  // 反証: 中断定型文を除外しない対照は real_user_msgs=4 / user_messages に定型文が混ざり fail する
  it('中断マーカー（[Request interrupted by user] / <turn_aborted>）は実 user に数えない', async () => {
    const s = await scanClaude(claudeFile(CL_REPEAT_A));
    expect(s.real_user_msgs).toBe(2);
    expect(s.user_messages).toEqual([
      'リベース中です。コンフリクトを解消してください。',
      'PR 123 コメントを取得して精査してください。',
    ]);
  });

  it('--sessions 出力に user_messages は含めない（肥大化防止の契約）', async () => {
    const r = await runCli([
      '--claude-root',
      claudeRoot,
      '--codex-root',
      codexRoot,
      '--sessions',
    ]);
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.sessions.length).toBeGreaterThan(0);
    for (const s of out.sessions) expect(s).not.toHaveProperty('user_messages');
  });
});

// ==================== EC-HS-7: 正規化と再発クラスタリング ====================
describe('EC-HS-7 正規化とクラスタリング', () => {
  it('normalizeMessage: 数値・URL・パス・コード・画像タグを畳む', () => {
    expect(normalizeMessage('PR 123 を見て https://example.com/x を確認')).toBe(
      'pr # を見て <url> を確認',
    );
    expect(normalizeMessage('/Users/x/git/foo/bar.ts を修正')).toBe(
      '<path> を修正',
    );
    expect(normalizeMessage('見て```js\nconst x=1;\n```直して')).toBe(
      '見て <code> 直して',
    );
    expect(normalizeMessage('<image name=[Image 42]>')).toBe('');
  });

  interface FakeSession {
    session_id: string;
    in_scope: boolean;
    likely_agent_driven: boolean;
    project_hint: string;
    month: string;
    user_messages: string[];
  }
  const mk = (
    id: string,
    msgs: string[],
    extra: Partial<FakeSession> = {},
  ): FakeSession => ({
    session_id: id,
    in_scope: true,
    likely_agent_driven: false,
    project_hint: 'proj',
    month: '2026-07',
    user_messages: msgs,
    ...extra,
  });

  it('セッション横断の同文はクラスタになる', () => {
    const cs = clusterUserMessages([
      mk('s1', ['コンフリクトを解消してください']),
      mk('s2', ['コンフリクトを解消してください']),
    ]);
    expect(cs).toHaveLength(1);
    expect(cs[0].session_count).toBe(2);
    expect(cs[0].msg_count).toBe(2);
  });

  // 反証: メッセージ総数で数える対照は単一セッション連打をクラスタ化して fail する
  it('単一セッション内の繰り返しは再発と数えない（セッション横断のみ）', () => {
    const cs = clusterUserMessages([
      mk('s1', ['同じ指示', '同じ指示', '同じ指示']),
    ]);
    expect(cs).toHaveLength(0);
  });

  it('数値・句読点ゆらぎの近接重複はマージされる', () => {
    const cs = clusterUserMessages([
      mk('s1', ['PR 123 コメントを取得して精査してください。']),
      mk('s2', ['PR 456 コメントを取得して、精査してください']),
    ]);
    expect(cs).toHaveLength(1);
    expect(cs[0].session_count).toBe(2);
  });

  // 反証: p3 を除外しない対照は委譲テンプレの逐語繰り返しでクラスタを量産し fail する
  it('agent-driven（p3 ヒューリスティック）セッションのメッセージは数えない', () => {
    const cs = clusterUserMessages([
      mk('s1', ['未コミット diff を静的検証してください'], {
        likely_agent_driven: true,
      }),
      mk('s2', ['未コミット diff を静的検証してください'], {
        likely_agent_driven: true,
      }),
    ]);
    expect(cs).toHaveLength(0);
  });

  it('out-of-scope セッションも数えない', () => {
    const cs = clusterUserMessages([
      mk('s1', ['同じ指示です'], { in_scope: false }),
      mk('s2', ['同じ指示です'], { in_scope: false }),
    ]);
    expect(cs).toHaveLength(0);
  });
});

// ==================== EC-HS-8: CLI --user-messages / --digest-cache ====================
describe('EC-HS-8 CLI クラスタ出力と差分キャッシュ', () => {
  const roots = [
    '--claude-root',
    claudeRoot,
    '--codex-root',
    codexRoot,
  ] as const;

  it('--user-messages で clusters を出し、fixture の繰り返し2組（近接重複含む）を検出する', async () => {
    const r = await runCli([...roots, '--user-messages']);
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout);
    const reps: string[] = out.clusters.map(
      (c: { representative: string }) => c.representative,
    );
    expect(reps.some((t) => t.includes('コンフリクトを解消'))).toBe(true);
    expect(reps.some((t) => t.includes('コメントを取得'))).toBe(true);
    for (const c of out.clusters) {
      expect(c.session_count).toBeGreaterThanOrEqual(2);
      expect(c.session_ids.length).toBeGreaterThan(0);
    }
  });

  it('--min-sessions 3 で 2 セッション再発は落ちる', async () => {
    const r = await runCli([
      ...roots,
      '--user-messages',
      '--min-sessions',
      '3',
    ]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).clusters).toHaveLength(0);
  });

  it('--min-sessions の 0 以下・非整数は exit 1', async () => {
    expect((await runCli(['--min-sessions', '0'])).code).toBe(1);
    expect((await runCli(['--min-sessions', 'x'])).code).toBe(1);
  });

  it('--digest-cache: 2回目は全ファイル hit し、clusters 出力が一致する', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hs-'));
    const cachePath = join(dir, 'digest.json');
    const r1 = await runCli([
      ...roots,
      '--user-messages',
      '--digest-cache',
      cachePath,
    ]);
    expect(r1.code).toBe(0);
    const o1 = JSON.parse(r1.stdout);
    expect(o1.summary.digest_cache.hits).toBe(0);
    expect(o1.summary.digest_cache.misses).toBeGreaterThan(0);
    const r2 = await runCli([
      ...roots,
      '--user-messages',
      '--digest-cache',
      cachePath,
    ]);
    const o2 = JSON.parse(r2.stdout);
    expect(o2.summary.digest_cache.misses).toBe(0);
    expect(o2.summary.digest_cache.hits).toBe(o1.summary.digest_cache.misses);
    expect(o2.clusters).toEqual(o1.clusters);
    expect(o2.summary.total).toBe(o1.summary.total);
  });

  it('壊れたキャッシュファイルは stderr 警告 + 空キャッシュで続行（fail-open, exit 0）', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hs-'));
    const cachePath = join(dir, 'digest.json');
    writeFileSync(cachePath, '{ broken');
    const r = await runCli([...roots, '--digest-cache', cachePath]);
    expect(r.code).toBe(0);
    expect(r.stderr).toContain('digest-cache');
  });

  // 反証: mtime+size 比較を落として `if (prev)` だけにする退行は、追記後も全 hit + 新クラスタ不在で fail する
  it('変更されたファイルは miss になり再スキャンで新内容が clusters に反映される（stale 提供の反証）', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hs-'));
    const root = join(dir, 'claude');
    cpSync(claudeRoot, root, { recursive: true });
    const cachePath = join(dir, 'digest.json');
    const args = [
      '--claude-root',
      root,
      '--codex-root',
      '/no/such/dir/zzz',
      '--user-messages',
      '--digest-cache',
      cachePath,
    ];
    const o1 = JSON.parse((await runCli(args)).stdout);
    const total = o1.summary.digest_cache.misses;
    expect(
      o1.clusters.some((c: { representative: string }) =>
        c.representative.includes('追記された新しい繰り返し指示'),
      ),
    ).toBe(false);
    const line =
      '\n' +
      JSON.stringify({
        type: 'user',
        message: { role: 'user', content: '追記された新しい繰り返し指示です' },
      }) +
      '\n';
    appendFileSync(join(root, `${CL_HUMAN}.jsonl`), line);
    appendFileSync(join(root, `${CL_MISSING}.jsonl`), line);
    const o2 = JSON.parse((await runCli(args)).stdout);
    expect(o2.summary.digest_cache.misses).toBe(2);
    expect(o2.summary.digest_cache.hits).toBe(total - 2);
    expect(
      o2.clusters.some((c: { representative: string }) =>
        c.representative.includes('追記された新しい繰り返し指示'),
      ),
    ).toBe(true);
  });

  // 反証: 版チェックを落とす退行は旧版キャッシュで全 hit になり fail する
  it('SCAN_VERSION 不一致のキャッシュは全捨てして再スキャンし、書き戻しで現行版に戻る', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hs-'));
    const cachePath = join(dir, 'digest.json');
    const args = [...roots, '--digest-cache', cachePath];
    const o1 = JSON.parse((await runCli(args)).stdout);
    const total = o1.summary.digest_cache.misses;
    const cached = JSON.parse(readFileSync(cachePath, 'utf8'));
    writeFileSync(
      cachePath,
      JSON.stringify({ ...cached, version: cached.version - 1 }),
    );
    const o2 = JSON.parse((await runCli(args)).stdout);
    expect(o2.summary.digest_cache.hits).toBe(0);
    expect(o2.summary.digest_cache.misses).toBe(total);
    expect(JSON.parse(readFileSync(cachePath, 'utf8')).version).toBe(
      cached.version,
    );
  });

  it('--top で clusters を切り詰め、clusters_total / clusters_truncated に痕跡を残す', async () => {
    const r = await runCli([...roots, '--user-messages', '--top', '1']);
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.clusters).toHaveLength(1);
    expect(out.summary.clusters_total).toBeGreaterThan(1);
    expect(out.summary.clusters_truncated).toBe(true);
  });

  it('--top の 0 以下・非整数は exit 1', async () => {
    expect((await runCli(['--top', '0'])).code).toBe(1);
    expect((await runCli(['--top', 'x'])).code).toBe(1);
  });
});

describe('EC-HS-5 出力フィールド名が下流契約に一致', () => {
  it('per-session 出力に source_session_updated_at が ISO 8601 で存在する（updated_at ではない）', async () => {
    const r = await runCli([
      '--claude-root',
      claudeRoot,
      '--codex-root',
      codexRoot,
      '--sessions',
    ]);
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout);
    const s = out.sessions[0];
    expect(s).toHaveProperty('source_session_updated_at');
    expect(s).not.toHaveProperty('updated_at');
    expect(s.source_session_updated_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
  });
});
