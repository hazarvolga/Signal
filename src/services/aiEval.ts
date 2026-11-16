export interface EvalCase {
  id: string;
  input: string;
  expectedOutput: string;
  category: "subject-line" | "spam-check" | "tone" | "content";
  tolerance?: number;
}

class AiEvalRegistry {
  private cases: EvalCase[] = [];

  addCase(testCase: EvalCase) {
    this.cases.push(testCase);
  }

  addCases(testCases: EvalCase[]) {
    this.cases.push(...testCases);
  }

  getCases(category?: string): EvalCase[] {
    if (category) return this.cases.filter((c) => c.category === category);
    return this.cases;
  }

  async runEval(
    metricFn: (input: string) => Promise<string>,
    category?: string
  ): Promise<{
    total: number;
    passed: number;
    failRate: number;
    results: Array<{ id: string; passed: boolean; expected: string; actual: string }>;
  }> {
    const cases = this.getCases(category);
    const results = [];
    let passed = 0;

    for (const tc of cases) {
      const actual = await metricFn(tc.input);
      const isMatch = actual.toLowerCase().includes(tc.expectedOutput.toLowerCase());
      if (isMatch) passed++;
      results.push({ id: tc.id, passed: isMatch, expected: tc.expectedOutput, actual });
    }

    return {
      total: cases.length,
      passed,
      failRate: cases.length > 0 ? 1 - passed / cases.length : 0,
      results,
    };
  }
}

export const aiEval = new AiEvalRegistry();
