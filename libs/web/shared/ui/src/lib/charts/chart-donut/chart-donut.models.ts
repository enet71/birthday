export interface ChartDonutConfigs<T = never> {
  ranges: ChartDonutRange<T>[];
}

export type ChartDonutRange<T = never> = {
  from: number;
  to: number;
  background: string;
  fill: string;
} & ([T] extends [never] ? object : { data: T });
