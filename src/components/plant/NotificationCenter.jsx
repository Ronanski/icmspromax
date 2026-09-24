import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AlertTriangle,Bell,CalendarClock,CheckCheck,Mail,MailOpen,PackageMinus,UserPlus,Zap} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import supabase from '@/lib/supabaseClient';
import {aged,agedBacklog,lowStockItems,overduePMs,newAssignments,today} from '@/components/plant/plantUtils';

const ICONS={critical:Zap,overdue:CalendarClock,aged:AlertTriangle,stock:PackageMinus,due:CalendarClock,assignment:UserPlus};
const notificationDate=item=>{const raw=item?.updated_at||item?.created_at||item?.created_date||item?.planned_start||item?.planned_finish;const date=raw?new Date(raw):new Date();return Number.isNaN(date.getTime())?new Date():date;};
const timeLabel=date=>new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'}).format(date);

const rowCache={};
const pendingKeys=new Set();

export default function NotificationCenter({orders=[],items=[],settings={},defaultCategory='corrective',onOpenJob,onGoToPM,onGoToItems}){
  const [rows,setRows]=useState(()=>({...rowCache}));
  const [category,setCategory]=useState(defaultCategory);
  const mounted=useRef(true);

  useEffect(()=>{
    mounted.current=true;
    return()=>{mounted.current=false;};
  },[]);

  const applyRows=useCallback(updater=>{
    setRows(previous=>{
      const next=typeof updater==='function'?updater(previous):{...previous,...updater};
      Object.keys(next).forEach(key=>{ rowCache[key]=next[key]; });
      return next;
    });
  },[]);

  const t=today();
  const notifications=useMemo(()=>{
    const cmOrders=orders.filter(j=>j.maintenance_type!=='PM'),pmOrders=orders.filter(j=>j.maintenance_type==='PM'),entries=[];
    cmOrders.filter(j=>j.job_type==='Break-In'&&j.priority==='Critical'&&['Open','In-Progress'].includes(j.status)).forEach(j=>entries.push({id:`critical-${j.id}`,category:'corrective',type:'critical',title:'Critical break-in work order',detail:`${j.wo_number||j.equipment_tag||'Order'} needs immediate attention.`,date:notificationDate(j),job:j,action:'Open job'}));
    agedBacklog(cmOrders).forEach(j=>entries.push({id:`aged-${j.id}`,category:'corrective',type:'aged',title:'Aged Overdue work order',detail:`${j.wo_number||j.equipment_tag||'Order'} is ${aged(j)} day(s) past its scheduled finish with no action taken.`,date:notificationDate(j),job:j,action:'Review order'}));
    overduePMs(pmOrders).forEach(j=>entries.push({id:`overdue-${j.id}`,category:'preventive',type:'overdue',title:'Preventive work order overdue',detail:`${j.wo_number||j.equipment_tag||'PM'} missed its planned start date.`,date:notificationDate(j),goPM:true,action:'View PM schedule'}));
    pmOrders.filter(j=>!['Completed','Cancelled'].includes(j.status)&&j.planned_start).forEach(j=>{const diff=Math.round((new Date(`${j.planned_start}T12:00:00`)-t)/(1000*60*60*24));if(diff>=0&&diff<=2)entries.push({id:`due-${j.id}`,category:'preventive',type:'due',title:`PM due in ${diff===0?'today':`${diff} days`}`,detail:`${j.wo_number||j.equipment_tag||'PM'} is scheduled for ${j.planned_start}.`,date:notificationDate(j),goPM:true,action:'View PM schedule'});});
    if(settings.notify_low_stock!==false)lowStockItems(items,settings.low_stock_threshold??5).forEach(item=>entries.push({id:`stock-${item.id||item.item_code}`,category:'corrective',type:'stock',title:'Low inventory level',detail:`${item.description||item.code} stock is at ${item.stock??0} (threshold: ${settings.low_stock_threshold??5}).`,date:notificationDate(item),goItems:true,action:'Check inventory'}));
    if(settings.notify_assignments!==false)newAssignments(cmOrders).forEach(j=>entries.push({id:`assignment-${j.id}`,category:'corrective',type:'assignment',title:'Assigned work not started',detail:`${j.wo_number||j.equipment_tag||'Order'} assigned to ${j.technician||'technician'}.`,date:notificationDate(j),job:j,action:'Open work order'}));
    return entries.sort((a,b)=>b.date-a.date);
  },[orders,items,settings,t]);

  // Direct Database Fetch Function
  const fetchRows = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const ownerId = auth?.user?.id || orders[0]?.owner_id;
      if (!ownerId) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('source_key, is_read')
        .eq('owner_id', ownerId);
      
      if (error) {
        console.error('Fetch notification error:', error);
        return;
      }

      if (!mounted.current) return;

      const dbMap = {};
      (data || []).forEach(r => {
        if (r.source_key) {
          dbMap[r.source_key] = { id: r.source_key, is_read: Boolean(r.is_read) };
        }
      });

      applyRows(previous => ({ ...previous, ...dbMap }));
    } catch (e) {
      console.error('Fetch notification exception:', e);
    }
  }, [applyRows, orders]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows, notifications.length]);

  // Set Read / Unread Status Function
  const setRead = useCallback(async (keys, value) => {
    if (!keys || !keys.length) return;
    
    // 1. Optimistic Update
    keys.forEach(k => pendingKeys.add(k));
    applyRows(previous => {
      const next = { ...previous };
      keys.forEach(k => {
        next[k] = { ...(previous[k] || {}), is_read: value };
      });
      return next;
    });

    try {
      const { data: auth } = await supabase.auth.getUser();
      const ownerId = auth?.user?.id || orders[0]?.owner_id;

      if (!ownerId) {
        console.error('NOTIF ERROR: No valid owner_id found!');
        return;
      }

      const isoNow = new Date().toISOString();

      // Payload with both 'detail' and 'message' to satisfy database constraints
      const upsertPayload = keys.map(k => {
        const notifItem = notifications.find(n => n.id === k);
        const detailText = String(notifItem?.detail || '');
        return {
          owner_id: ownerId,
          source_key: String(k),
          category: notifItem?.category || 'corrective',
          type: notifItem?.type || 'aged',
          title: String(notifItem?.title || 'Notification'),
          detail: detailText,
          message: detailText,
          event_at: notifItem?.date ? new Date(notifItem.date).toISOString() : isoNow,
          is_read: Boolean(value),
          read_at: value ? isoNow : null
        };
      });

      // Upsert Query
      const { data, error } = await supabase
        .from('notifications')
        .upsert(upsertPayload, { onConflict: 'owner_id, source_key' })
        .select();

      if (error) {
        console.error('SUPABASE UPSERT ERROR DETAILS:', error);
      } else {
        await fetchRows();
      }
    } catch (err) {
      console.error('Failed setRead execution:', err);
    } finally {
      setTimeout(() => {
        keys.forEach(k => pendingKeys.delete(k));
      }, 300);
    }
  }, [applyRows, fetchRows, notifications, orders]);

  const isRead = id => Boolean(rows[id]?.is_read || rows[String(id)]?.is_read);

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
