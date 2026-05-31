import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { ApiClient } from '../api/client.js';
import { searchSkillSheetProjects } from '../api/skill-sheet.js';

interface McpConfig {
  mcpServers?: Record<
    string,
    {
      env?: Record<string, string>;
    }
  >;
}

export async function resolveProjectsForCwd(
  apiClient: ApiClient,
  cwd: string | undefined,
): Promise<Array<{ id: number; title?: string }>> {
  const projectMatch = findProjectMatch(cwd);
  if (!projectMatch) return [];

  const projects = await searchSkillSheetProjects(apiClient, projectMatch);
  const selected = selectProject(projects, projectMatch);
  return selected ? [selected] : [];
}

function findProjectMatch(cwd: string | undefined): string | undefined {
  if (!cwd) return undefined;

  const directories = ancestorDirectories(cwd);
  for (const directory of directories) {
    const fromMcpJson = readProjectMatchFromMcpJson(
      join(directory, '.mcp.json'),
    );
    if (fromMcpJson) return fromMcpJson;

    const fromCodexConfig = readProjectMatchFromText(
      join(directory, '.codex', 'config.toml'),
    );
    if (fromCodexConfig) return fromCodexConfig;
  }

  return undefined;
}

function readProjectMatchFromMcpJson(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined;

  try {
    const config = JSON.parse(readFileSync(filePath, 'utf8')) as McpConfig;
    return Object.values(config.mcpServers || {})
      .map((server) => server.env?.PAPUT_PROJECT_MATCH)
      .find((value): value is string => Boolean(value));
  } catch {
    return undefined;
  }
}

function readProjectMatchFromText(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined;

  const match = readFileSync(filePath, 'utf8').match(
    /PAPUT_PROJECT_MATCH\s*=\s*["']([^"']+)["']/,
  );
  return match?.[1];
}

function ancestorDirectories(cwd: string): string[] {
  const directories: string[] = [];
  let current = cwd;
  const root = parse(cwd).root;

  while (true) {
    directories.push(current);
    if (current === root) return directories;
    current = dirname(current);
  }
}

function selectProject(
  projects: Array<{ id: number; title: string }>,
  projectMatch: string,
): { id: number; title: string } | undefined {
  if (projects.length === 0) return undefined;

  const normalizedMatch = projectMatch.toLowerCase();
  const exact = projects.find(
    (project) => project.title.toLowerCase() === normalizedMatch,
  );
  if (exact) return exact;

  return projects.length === 1 ? projects[0] : undefined;
}
