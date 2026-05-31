import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

interface SetupOptions {
  force: boolean;
  noRules: boolean;
  claude: boolean;
  codex: boolean;
}

interface SkillSpec {
  name: string;
  description: string;
  body: string;
}

const SKILLS: SkillSpec[] = [
  {
    name: 'paput-init',
    description:
      'PaPut の初期設定、既存メモ同期、未処理セッション確認を行いたい時に使う。',
    body: `# PaPut 初期設定

PaPut の知見保存運用を始めるための初期設定を行う。

## 手順

1. \`paput_cache_status\` でローカルキャッシュ状態を確認する。
2. \`paput_sync_remote_memos\` で既存 PaPut メモをローカルキャッシュへ同期する。
3. \`paput_scan_sessions\` で Claude/Codex の未処理セッションを確認する。
4. 未処理セッションがある場合は、件数と概要をユーザーに提示する。
5. ユーザーが希望した場合のみ、\`paput_get_session_transcript\` で本文を取得し、知見候補を抽出して \`paput_add_knowledge_candidates\` で pending に保存する。

## 注意

- PaPut への本保存は行わない。
- 候補はまず pending に保存する。
- 重複や類似メモがある場合は、その情報を提示する。`,
  },
  {
    name: 'paput-sync',
    description:
      'PaPut の既存メモをローカルキャッシュへ同期し、重複判定の精度を上げたい時に使う。',
    body: `# PaPut 同期

PaPut の既存メモをローカルキャッシュへ同期する。

## 手順

1. \`paput_cache_status\` で同期前の状態を確認する。
2. \`paput_sync_remote_memos\` を実行する。
3. 再度 \`paput_cache_status\` を実行し、同期後の件数を確認する。
4. 同期結果を簡潔にユーザーへ報告する。

## 注意

- 同期は重複判定のために行う。
- pending 候補の保存や破棄は行わない。
- PaPut への新規メモ作成は行わない。`,
  },
  {
    name: 'paput-save',
    description:
      'PaPut の pending 候補を確認し、ユーザーが承認したものだけ PaPut に保存したい時に使う。',
    body: `# PaPut 保存

pending に保存された知見候補を確認し、ユーザーが承認したものだけ PaPut に保存する。

## 手順

1. \`paput_list_pending_candidates\` で pending 候補を取得する。
2. 候補ごとにタイトル、カテゴリ、要約、類似メモ情報を簡潔に提示する。
3. ユーザーが保存を承認した候補だけ \`paput_save_pending_candidate\` で PaPut に保存する。
4. ユーザーが不要と判断した候補は \`paput_discard_pending_candidate\` で破棄する。
5. 保存・破棄した件数を報告する。

## 注意

- ユーザー承認なしに PaPut へ保存しない。
- 「全部保存して」と明示された場合のみ複数候補をまとめて保存する。
- 候補のタイトルや本文の修正を求められた場合は、保存時に上書きする。
- 迷う候補や重複が疑われる候補は、保存しない選択肢も提示する。`,
  },
  {
    name: 'paput-capture',
    description:
      '作業中の会話や指定テーマから PaPut に残す知見候補を抽出し、pending に保存したい時に使う。',
    body: `# PaPut 知見候補作成

現在の会話やユーザーが指定したテーマから、PaPut に残すべき知見候補を抽出して pending に保存する。グローバルルールで自動提案されなかった時の手動バックアップとして使う。

## 使う場面

- 問題解決で得た知見を残したい時
- 設計判断やその理由を残したい時
- ベストプラクティスやデバッグ手法を残したい時
- ユーザーが特定テーマのメモ化を依頼した時

## 手順

1. \`paput_list_pending_candidates\` で既存 pending 候補を確認する。
2. 現在の会話、またはユーザーが指定したテーマに関連する会話内容から、再利用可能な知見だけを抽出する。
3. 候補は小さい単位に分け、タイトル、本文、カテゴリ、公開設定を提示する。
4. 既存 pending と重複しそうな候補は追加せず、既存候補の利用を提案する。
5. ユーザーが承認した候補だけ \`paput_add_knowledge_candidates\` で pending に保存する。

## メモ作成ルール

- 一つの候補が大きくなりすぎないよう、最小の粒度で作成する。
- タイトルは簡潔で検索しやすくする。
- 本文は具体的な手順、原因、理由、判断基準を含める。
- 文章は「です/ます」調にしない。
- カテゴリは言語、フレームワーク、ツール程度の粒度にする。
- プロジェクト固有のコード、秘密情報、顧客情報は含めない。
- 基本的に非公開として扱う。
- 本文に Markdown の \`#\` で始まる見出し行を含めない。

## 注意

- PaPut へ直接保存しない。
- 保存先は pending のみ。PaPut への本保存は \`paput-save\` で行う。
- 候補がない場合は、無理に作らず「保存すべき知見は見つからない」と伝える。`,
  },
];

const RULES = `## PaPut 知見保存ルール

作業完了時、問題解決時、設計判断が固まった時、または再利用可能な知見が発生した時は、PaPut に保存すべき候補がないか自動で確認する。

候補がある場合は、ユーザーにコマンド実行を求めず、タイトル・本文・カテゴリを提示する。ユーザーが承認したら \`paput_add_knowledge_candidates\` で pending に保存する。

PaPut への本保存は、ユーザーが明示的に保存を承認した場合のみ \`paput_save_pending_candidate\` を使う。

保存前にはローカルキャッシュや類似メモ情報を使って重複の可能性を確認する。重複が疑われる場合は、保存しない判断も提示する。

pending 候補の確認や PaPut への保存をユーザーが求めた場合は、\`paput-save\` の手順に従う。`;

const RULE_START = '<!-- paput-mcp:start -->';
const RULE_END = '<!-- paput-mcp:end -->';

export function setupAi(args: string[]): void {
  const options = parseOptions(args);
  const paputHome = process.env.PAPUT_HOME || join(homedir(), '.paput');
  const sourceSkillsDir = join(paputHome, 'skills');

  printSetupNotice(options);
  createSourceSkills(sourceSkillsDir, options.force);

  if (options.claude) {
    setupClaude(sourceSkillsDir, options);
  }

  if (options.codex) {
    setupCodex(sourceSkillsDir, options);
  }
}

function parseOptions(args: string[]): SetupOptions {
  const claudeOnly = args.includes('--claude-only');
  const codexOnly = args.includes('--codex-only');

  if (claudeOnly && codexOnly) {
    console.error('--claude-only と --codex-only は同時に指定できません。');
    process.exitCode = 1;
    return {
      force: false,
      noRules: false,
      claude: false,
      codex: false,
    };
  }

  return {
    force: args.includes('--force'),
    noRules: args.includes('--no-rules'),
    claude: !codexOnly,
    codex: !claudeOnly,
  };
}

function printSetupNotice(options: SetupOptions): void {
  console.log('PaPut AI 連携の初期設定を行います。');
  console.log('');
  console.log('このコマンドは以下を実行します。');
  console.log('- ~/.paput/skills に PaPut Skill の正本を作成');
  if (options.claude) {
    console.log('- Claude が存在する場合、~/.claude/skills にリンクを作成');
  }
  if (options.codex) {
    console.log('- Codex が存在する場合、~/.agents/skills にリンクを作成');
  }
  if (!options.noRules) {
    console.log('- Claude/Codex のグローバルルールに PaPut 利用ルールを追記');
  }
  console.log('');
  console.log(
    'グローバルルールを変更したくない場合は --no-rules を指定してください。',
  );
  console.log(
    '既存の PaPut 管理ブロックやリンクを更新する場合は --force を指定してください。',
  );
  console.log('');
}

function createSourceSkills(sourceSkillsDir: string, force: boolean): void {
  mkdirSync(sourceSkillsDir, { recursive: true });

  for (const skill of SKILLS) {
    const skillDir = join(sourceSkillsDir, skill.name);
    const skillPath = join(skillDir, 'SKILL.md');

    if (existsSync(skillPath) && !force) {
      console.log(`Skip source skill: ${skillPath} は既に存在します。`);
      continue;
    }

    mkdirSync(skillDir, { recursive: true });
    writeFileSync(skillPath, renderSkill(skill), 'utf8');
    console.log(`Create source skill: ${skillPath}`);
  }
}

function setupClaude(sourceSkillsDir: string, options: SetupOptions): void {
  const claudeHome = process.env.CLAUDE_HOME || join(homedir(), '.claude');
  if (!existsSync(claudeHome)) {
    console.log('Skip Claude: ~/.claude が見つかりません。');
    return;
  }

  linkSkills(
    sourceSkillsDir,
    join(claudeHome, 'skills'),
    'Claude',
    options.force,
  );

  if (!options.noRules) {
    upsertRules(join(claudeHome, 'CLAUDE.md'), options.force, 'Claude');
  }
}

function setupCodex(sourceSkillsDir: string, options: SetupOptions): void {
  const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex');
  const agentsHome = process.env.AGENTS_HOME || join(homedir(), '.agents');
  if (!existsSync(codexHome) && !existsSync(agentsHome)) {
    console.log('Skip Codex: ~/.codex と ~/.agents が見つかりません。');
    return;
  }

  linkSkills(
    sourceSkillsDir,
    join(agentsHome, 'skills'),
    'Codex',
    options.force,
  );

  if (!options.noRules) {
    upsertRules(join(codexHome, 'AGENTS.md'), options.force, 'Codex');
  }
}

function linkSkills(
  sourceSkillsDir: string,
  targetSkillsDir: string,
  label: string,
  force: boolean,
): void {
  mkdirSync(targetSkillsDir, { recursive: true });

  for (const skill of SKILLS) {
    const sourceDir = join(sourceSkillsDir, skill.name);
    const targetDir = join(targetSkillsDir, skill.name);

    if (existsSync(targetDir)) {
      const stat = lstatSync(targetDir);
      if (!force) {
        console.log(
          `Skip ${label} skill link: ${targetDir} は既に存在します。`,
        );
        continue;
      }
      rmSync(targetDir, {
        recursive: stat.isDirectory() && !stat.isSymbolicLink(),
        force: true,
      });
    }

    symlinkSync(sourceDir, targetDir, 'dir');
    console.log(`Link ${label} skill: ${targetDir} -> ${sourceDir}`);
  }
}

function upsertRules(path: string, force: boolean, label: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const block = `${RULE_START}\n${RULES}\n${RULE_END}`;
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const pattern = new RegExp(
    `${escapeRegExp(RULE_START)}[\\s\\S]*?${escapeRegExp(RULE_END)}`,
  );

  if (pattern.test(current)) {
    if (!force) {
      console.log(
        `Skip ${label} rules: ${path} には PaPut 管理ブロックが既に存在します。`,
      );
      return;
    }

    writeFileSync(path, current.replace(pattern, block), 'utf8');
    console.log(`Update ${label} rules: ${path}`);
    return;
  }

  const next = `${current.trimEnd()}${current ? '\n\n' : ''}${block}\n`;
  writeFileSync(path, next, 'utf8');
  console.log(`Append ${label} rules: ${path}`);
}

function renderSkill(skill: SkillSpec): string {
  return `---
name: ${skill.name}
description: ${skill.description}
---

${skill.body}
`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
