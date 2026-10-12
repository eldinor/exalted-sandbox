import { realForestVariant, usesBorderImpostor, type ForestSite } from './ClosedForestPlacement.ts';
export const BIG_TREE_DENSITY=.5;
function rank(site:ForestSite):number {
    let h=Math.imul(Math.round(site.x*1000),73856093)^Math.imul(Math.round(site.z*1000),19349663)^43719;
    h=Math.imul(h^(h>>>16),2246822507);return (h^(h>>>13))>>>0;
}
/** Keep exactly half per real big model (rounded up), without thinning cards. */
export function thinBigTrees<T extends ForestSite & {variant?:string}>(sites:readonly T[]):T[] {
    const groups=new Map<string,T[]>(),removed=new Set<T>();
    for(const site of sites){
        if(!site.variant&&usesBorderImpostor(site.x,site.z))continue;
        const variant=site.variant??realForestVariant(site.x,site.z);
        if(variant!=='Pine_big_1'&&variant!=='Fir_large_2')continue;
        const group=groups.get(variant)??[];if(!groups.has(variant))groups.set(variant,group);group.push(site);
    }
    for(const group of groups.values()){
        group.sort((a,b)=>rank(a)-rank(b)||a.x-b.x||a.z-b.z);
        for(let i=Math.ceil(group.length*BIG_TREE_DENSITY);i<group.length;i++)removed.add(group[i]);
    }
    return sites.filter(site=>!removed.has(site));
}
