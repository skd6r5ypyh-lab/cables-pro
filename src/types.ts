export type Route = 'dashboard'|'jobs'|'customers'|'diary'|'more'|'record'|'list';

export interface Customer {
  id:string; name:string; address:string; phone:string; email:string; created:string;
}
export interface Job {
  id:string; customerId:string; title:string; module:string; date:string; time:string;
  status:'Booked'|'Travelling'|'On site'|'In progress'|'Complete'; value:number; notes:string;
}
export interface BusinessRecord {
  id:string; kind:'Quote'|'Invoice'|'Contract'|'Asset'|'Report'|'Stock';
  reference:string; customerId?:string; title:string; status:string; date:string; amount?:number; details:string;
}
export interface AppData {
  customers:Customer[]; jobs:Job[]; records:BusinessRecord[];
}
