export interface GrassMixEntry { variant: string; percentage: number; }

/** Keep integer percentages totaling 100, redistributing the remaining share. */
export function changeGrassMixShare(mix: readonly GrassMixEntry[], index: number, percentage: number): GrassMixEntry[] {
    const result = mix.map(entry => ({ ...entry }));
    const target = result[index];
    if (!target) return result;
    target.percentage = Math.round(Math.max(0, Math.min(100, percentage)));
    const others = result.filter((_, i) => i !== index);
    if (!others.length) { target.percentage = 100; return result; }
    const remaining = 100 - target.percentage;
    const total = others.reduce((sum, entry) => sum + entry.percentage, 0);
    const fractions = others.map((entry, order) => {
        const exact = remaining * (total > 0 ? entry.percentage / total : 1 / others.length);
        entry.percentage = Math.floor(exact);
        return { entry, fraction: exact - entry.percentage, order };
    }).sort((a, b) => b.fraction - a.fraction || a.order - b.order);
    let leftover = remaining - others.reduce((sum, entry) => sum + entry.percentage, 0);
    for (const item of fractions) if (leftover-- > 0) item.entry.percentage++;
    return result;
}
