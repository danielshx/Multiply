/**
 * HR Twin DB client. Twin = HappyRobot's built-in 20GB Postgres-style store
 * with workflow-dump (auto-row-per-run) and SQL console.
 *
 * Used as a parallel write target so the jury sees native platform use.
 *
 * Brain-repo: planning/03-architecture.md ("Alternative: platform-native"),
 * planning/04-tech-stack.md ("Hybrid recommended"),
 * planning/05-happyrobot-workflows.md ("Twin DB as workflow dump").
 *
 * Stub. Verify exact endpoint + auth shape from HR docs in next pass.
 */

export interface TwinLearning {
  id?: string;
  pattern: string;
  trigger: string;
  applied_count?: number;
  created_at?: string;
}

export async function readLearnings(): Promise<TwinLearning[]> {
  // TODO: implement against actual Twin REST/SQL endpoint.
  return [];
}

export async function writeLearning(
  _learning: Omit<TwinLearning, "id" | "created_at">,
): Promise<void> {
  // TODO: implement.
}
