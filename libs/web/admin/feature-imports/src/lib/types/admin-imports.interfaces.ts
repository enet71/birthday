// A background step of the import, counted over all imported people.
export interface AdminImportStage {
  label: string;
  done: number;
  total: number;
  // 0–100.
  percent: number;
}
