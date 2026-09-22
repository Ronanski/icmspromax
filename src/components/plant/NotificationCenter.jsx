import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AlertTriangle,Bell,CalendarClock,CheckCheck,Mail,MailOpen,PackageMinus,UserPlus,Zap} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import supabase from '@/lib/supabaseClient';
import {aged,lowStockItems,overduePMs,newAssignments,today} from '@/components/plant/plantUtils';

const ICONS={critical:Zap,overdue:CalendarClock,aged:AlertTriangle,stock:PackageMinus,due:CalendarClock,assignment:UserPlus};
const notificationDate=item=>{const raw=item?.updated_at||item?.created_at||item?.created_date||item?.planned_start||item?.planned_finish;const date=raw?new Date(raw):new Date();return Number.isNaN(date.getTime())?new Date():date;};
const timeLabel=date=>new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'}).format(date);

// Stored rows (source_key -> {id, is_read}) live outside the component so
// switching tabs (Today's Focus -> PM -> back) or remounting the bell keeps the
// acknowledgements already read from the database.
const rowCache={};
// Keys the user just acted on. A database read that was already in flight must
// never roll these back to their stale value.
const pendingKeys=new Set();

export default function NotificationCenter({orders=[],items=[],settings={},defaultCategory='corrective',onOpenJob,onGoToPM,onGoToItems}){
  const [rows,setRows]=useState(()=>({...rowCache}));
  const [category,setCategory]=useState(defaultCategory);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const applyRows=useCallback(updater=>{
    setRows(previous=>{
      const next=typeof updater==='function'?updater(previous):{...previous,...updater};
      Object.keys(next).forEach(key=>{rowCache[key]=next[key];});
      return next;
    });
  },[]);
  const t=today();
  const notifications=useMemo(()=>{
    const cmOrders=orders.filter(j=>j.maintenance_type!=='PM'),pmOrders=orders.filter(j=>j.maintenance_type==='PM'),entries=[];
    cmOrders.filter(j=>j.job_type==='Break-In'&&j.priority==='Critical'&&['Open','In-Progress'].includes(j.status)).forEach(j=>entries.push({id:`critical-${j.id}`,category:'corrective',type:'critical',title:'Emergency corrective work order',detail:`${j.wo_number} · ${j.description}`,date:notificationDate(j),job:j,action:'Open work order'}));
    cmOrders.filter(j=>aged(j)>0).forEach(j=>entries.push({id:`aged-${j.id}`,category:'corrective',type:'aged',title:'Corrective work order past SLA',detail:`${j.wo_number} · ${aged(j)} days aged`,date:notificationDate(j),job:j,action:'Review'}));
    overduePMs(pmOrders).forEach(j=>entries.push({id:`overdue-${j.id}`,category:'preventive',type:'overdue',title:'Preventive work order overdue',detail:`${j.wo_number} · ${j.description}`,date:notificationDate(j),job:j,action:'Open PM'}));
    pmOrders.filter(j=>{if(['Completed','Cancelled'].includes(j.status)||!j.planned_start)return false;const diff=Math.round((new Date(`${j.planned_start}T12:00:00`)-new Date(`${t}T12:00:00`))/86400000);return diff>=0&&diff<=3;}).forEach(j=>entries.push({id:`due-${j.id}`,category:'preventive',type:'due',title:'Preventive work order due soon',detail:`${j.wo_number} · Due ${j.planned_start}`,date:notificationDate(j),job:j,action:'Open PM'}));
    if(settings.notify_low_stock!==false)lowStockItems(items,settings.low_stock_threshold??5).forEach(item=>entries.push({id:`stock-${item.id||item.item_code}`,category:'corrective',type:'stock',title:'Spare part low on stock',detail:`${item.item_code||item.name||'Item'} · Reorder required`,date:notificationDate(item),goItems:true,action:'Item Master'}));
    if(settings.notify_assignments!==false)newAssignments(cmOrders).forEach(j=>entries.push({id:`assignment-${j.id}`,category:'corrective',type:'assignment',title:'Assigned work not started',detail:`${j.wo_number} · ${j.technician||'Assigned technician'}`,date:notificationDate(j),job:j,action:'Open work order'}));
    return entries.sort((a,b)=>b.date-a.date);
  },[orders,items,settings,t]);

  const signature=notifications.map(n=>n.id).join('|');
  const keysRef=useRef([]);
  keysRef.current=notifications.map(n=>n.id);

  // The database is the single source of truth. Alerts generated from work
  // orders are cross-referenced by `source_key`; existing rows are never
  // rewritten, so is_read = true survives every reload and navigation.
  const fetchRows=useCallback(async ownerId=>{
    const keys=keysRef.current;
    if(!keys.length)return;
    const {data,error}=await supabase.from('notifications').select('id,source_key,is_read').eq('owner_id',ownerId).in('source_key',keys);
    if(error||!mounted.current)return;
    applyRows(previous=>{
      const next={...previous};
      (data||[]).forEach(r=>{
        if(pendingKeys.has(r.source_key))return; // a click in flight wins
        next[r.source_key]={id:r.id,is_read:!!r.is_read};
      });
      return next;
    });
  },[applyRows]);

  const sync=useCallback(async()=>{
    if(!notifications.length)return;
    try{
      const {data:auth}=await supabase.auth.getUser();
      const ownerId=auth?.user?.id;
      if(!ownerId)return;
      const {data:existing}=await supabase.from('notifications').select('source_key').eq('owner_id',ownerId).in('source_key',keysRef.current);
      const stored=new Set((existing||[]).map(r=>r.source_key));
      const missing=notifications.filter(n=>!stored.has(n.id));
      if(missing.length){
        const inserts=missing.map(n=>({owner_id:ownerId,source_key:n.id,category:n.category,type:n.type,title:n.title,detail:n.detail,event_at:n.date.toISOString(),is_read:false}));
        await supabase.from('notifications').insert(inserts); // duplicates from a parallel tab are rejected by the unique key, never updated
      }
      await fetchRows(ownerId);
    }catch{/* alerts still render from the last known read state */}
  },[signature,fetchRows]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{sync();},[sync]);

  // Realtime: acknowledging an alert on a PC updates the phone instantly,
  // without a page refresh.
  useEffect(()=>{
    let channel,active=true;
    (async()=>{
      const {data:auth}=await supabase.auth.getUser();
      const ownerId=auth?.user?.id;
      if(!ownerId||!active)return;
      channel=supabase.channel('public:notifications')
        .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`owner_id=eq.${ownerId}`},()=>{fetchRows(ownerId);})
        .subscribe();
    })();
    return()=>{active=false;if(channel)supabase.removeChannel(channel);};
  },[fetchRows]);

  const setRead=useCallback(async(keys,value)=>{
    if(!keys.length)return;
    keys.forEach(k=>pendingKeys.add(k));
    const rollback={};
    applyRows(previous=>{
      const next={...previous};
      keys.forEach(k=>{rollback[k]=previous[k];next[k]={...(previous[k]||{}),is_read:value};});
      return next;
    });
    try{
      const {data:auth}=await supabase.auth.getUser();
      const ownerId=auth?.user?.id;
      if(!ownerId)return;
      const patch={is_read:value,read_at:value?new Date().toISOString():null};
      const ids=keys.map(k=>rowCache[k]?.id).filter(Boolean);
      const {error}=ids.length===keys.length
        ?await supabase.from('notifications').update(patch).in('id',ids)
        :await supabase.from('notifications').update(patch).eq('owner_id',ownerId).in('source_key',keys);
      if(error)throw error;
      keys.forEach(k=>pendingKeys.delete(k));
      await fetchRows(ownerId);
    }catch{
      // Write failed — restore the last known truth from the database.
      applyRows(previous=>{const next={...previous};keys.forEach(k=>{if(rollback[k])next[k]=rollback[k];else delete next[k];});return next;});
    }finally{
      keys.forEach(k=>pendingKeys.delete(k));
    }
  },[applyRows,fetchRows]);

  const isRead=id=>rows[id]?.is_read===true;
  const unread=notifications.filter(n=>!isRead(n.id)).length;
  const visibleNotifications=notifications.filter(n=>n.category===category);
  const categoryUnread=visibleNotifications.filter(n=>!isRead(n.id)).length;
  const markRead=id=>setRead([id],true);
  const markUnread=id=>setRead([id],false);
  const markAllRead=()=>setRead(visibleNotifications.filter(n=>!isRead(n.id)).map(n=>n.id),true);
  const markAllUnread=()=>setRead(visibleNotifications.filter(n=>isRead(n.id)).map(n=>n.id),false);
  const openNotification=n=>{markRead(n.id);if(n.goItems)onGoToItems?.();else if(n.job)onOpenJob?.(n.job);else if(n.type==='due'||n.type==='overdue')onGoToPM?.();};
  return <Popover><PopoverTrigger asChild><button type="button" className="secondary-button notification-trigger" aria-label={`${unread} unread notifications`} title="Notifications"><Bell size={16}/><span>Notifications</span>{unread>0&&<b>{unread>99?'99+':unread}</b>}</button></PopoverTrigger><PopoverContent align="end" sideOffset={8} className="notification-popover">
    <div className="notification-head"><div><strong>Notifications</strong><span>{unread} unread across all work orders</span></div><div className="notification-bulk-actions"><button type="button" onClick={markAllRead} disabled={!categoryUnread}><CheckCheck size={14}/>Mark all as read</button><button type="button" onClick={markAllUnread} disabled={!visibleNotifications.some(n=>isRead(n.id))}><Mail size={14}/>Mark all as unread</button></div></div>
    <div className="notification-categories" role="tablist" aria-label="Notification type"><button type="button" role="tab" aria-selected={category==='corrective'} className={category==='corrective'?'active':''} onClick={()=>setCategory('corrective')}>Corrective <b>{notifications.filter(n=>n.category==='corrective'&&!isRead(n.id)).length}</b></button><button type="button" role="tab" aria-selected={category==='preventive'} className={category==='preventive'?'active':''} onClick={()=>setCategory('preventive')}>Preventive <b>{notifications.filter(n=>n.category==='preventive'&&!isRead(n.id)).length}</b></button></div>
    <div className="notification-list">{visibleNotifications.length?visibleNotifications.map(n=>{const Icon=ICONS[n.type]||Bell,read=isRead(n.id);return <article key={n.id} className={`notification-item ${n.type} ${read?'read':'unread'}`}><button type="button" className="notification-main" onClick={()=>openNotification(n)}><span className="notification-type-icon"><Icon size={16}/></span><span className="notification-copy"><strong>{n.title}</strong><span>{n.detail}</span><time dateTime={n.date.toISOString()}>{timeLabel(n.date)}</time></span>{!read&&<i aria-label="Unread"/>}</button><div className="notification-actions"><button type="button" onClick={()=>openNotification(n)}>{n.action}</button>{read?<button type="button" onClick={()=>markUnread(n.id)}><MailOpen size={13}/>Mark as unread</button>:<button type="button" onClick={()=>markRead(n.id)}><CheckCheck size={13}/>Acknowledge</button>}</div></article>}):<div className="notification-empty"><Bell size={24}/><strong>All clear</strong><span>No {category} work order alerts.</span></div>}</div>
  </PopoverContent></Popover>;
}
