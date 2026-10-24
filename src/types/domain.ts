export type Region="LATAM"|"UAE";
export type ModuleCode="crm"|"sales"|"inventory"|"collections"|"calendar"|"reports"|"logistics"|"fleet"|"dispatch"|"delivery"|"cod"|"ai_automation";
export interface OrganizationContext{id:string;name:string;region:Region;countryCode:string;currencyCode:string;locale:string;timezone:string}
