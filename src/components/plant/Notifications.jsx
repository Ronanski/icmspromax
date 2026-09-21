import React from 'react';
import {AlertTriangle,Zap,CalendarClock,PackageMinus,UserPlus} from 'lucide-react';
import {aged,today,lowStockItems,overduePMs,newAssignments} from '@/components/plant/plantUtils';

// Notification center: critical break-ins, aged WOs, overdue/upcoming PMs,
// low spare-part stock and freshly assigned work.
export default function Notifications({orders=[],items=[],settings={},onOpenJob,onGoToPM,onGoToItems}) {
  const t=today();
  const agedJobs=orders.filter(j=>aged(j)>0).sort((a,b)=>aged(b)-aged(a));
  const criticalBreakIns=orders.filter(j=>j.job_type==='Break-In'&&j.priority==='Critical'&&(j.status==='Open'||j.status==='In-Progress'));
  const pmDue=orders.filter(j=>{
    if(j.maintenance_type!=='PM')return false;
    if(['Completed','Cancelled'].includes(j.status))return false;
    const ps=j.planned_start;
    if(!ps)return false;
    const diff=Math.round((new Date(ps+'T12:00:00')-new Date(t+'T12:00:00'))/86400000);
    return diff>=0&&diff<=3;
  });
  const overdue=settings.notify_overdue_pm===false?[]:overduePMs(orders);
  const lowStock=settings.notify_low_stock===false?[]:lowStockItems(items,settings.low_stock_threshold??5);
  const assigned=settings.notify_assignments===false?[]:newAssignments(orders);
  const total=agedJobs.length+criticalBreakIns.length+pmDue.length+overdue.length+lowStock.length+assigned.length;
  if(!total)return null;
  return <div className="notif-stack">
    {criticalBreakIns.length>0&&<div className="notif-banner critical" role="alert">
      <span className="notif-icon"><Zap size={18}/></span>
      <div><strong>{criticalBreakIns.length} Emergency Break-In{criticalBreakIns.length!==1?'s':''}</strong><span>Immediate attention required — open to assign manpower.</span></div>
      <button className="notif-link" onClick={()=>onOpenJob?.(criticalBreakIns[0])}>Open</button>
    </div>}
    {overdue.length>0&&<div className="notif-banner aged" role="alert">
      <span className="notif-icon"><CalendarClock size={18}/></span>
      <div><strong>{overdue.length} Overdue PM Job{overdue.length!==1?'s':''}</strong><span>Planned date has passed — reschedule or complete to keep the cycle intact.</span></div>
      <button className="notif-link" onClick={onGoToPM}>View PM</button>
    </div>}
    {agedJobs.length>0&&<div className="notif-banner aged" role="alert">
      <span className="notif-icon"><AlertTriangle size={18}/></span>
      <div><strong>{agedJobs.length} Aged Work Order{agedJobs.length!==1?'s':''}</strong><span>Exceeded SLA threshold (Emergency 0d · Urgent 4d · Normal 15d · Low Priority 45d).</span></div>
      <button className="notif-link" onClick={()=>onOpenJob?.(agedJobs[0])}>Review</button>
    </div>}
    {lowStock.length>0&&<div className="notif-banner stock" role="alert">
      <span className="notif-icon"><PackageMinus size={18}/></span>
      <div><strong>{lowStock.length} Spare Part{lowStock.length!==1?'s':''} Low on Stock</strong><span>At or below the re-order level of {settings.low_stock_threshold??5}. Raise a purchase request.</span></div>
      {onGoToItems&&<button className="notif-link" onClick={onGoToItems}>Item Master</button>}
    </div>}
    {pmDue.length>0&&<div className="notif-banner pm" role="alert">
      <span className="notif-icon"><CalendarClock size={18}/></span>
      <div><strong>{pmDue.length} PM Due Within 3 Days</strong><span>Preventive maintenance approaching target date.</span></div>
      <button className="notif-link" onClick={onGoToPM}>View PM</button>
    </div>}
    {assigned.length>0&&<div className="notif-banner assign" role="alert">
      <span className="notif-icon"><UserPlus size={18}/></span>
      <div><strong>{assigned.length} Assigned Job{assigned.length!==1?'s':''} Not Started</strong><span>Manpower is assigned but the work is still Open.</span></div>
      <button className="notif-link" onClick={()=>onOpenJob?.(assigned[0])}>Open</button>
    </div>}
  </div>;
}
