import { jsonrepair } from 'jsonrepair';

export class RepairJsonParser {
  async invoke(raw: string): Promise<Record<string, unknown>> {
    const trimmed = raw.trim();
    const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const content = jsonMatch ? jsonMatch[1].trim() : trimmed;
    const repaired = jsonrepair(content);
    return JSON.parse(repaired) as Record<string, unknown>;
  }
}

export const repairJsonParser = new RepairJsonParser();
