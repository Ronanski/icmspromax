import React,{useState,useEffect,useMemo} from 'react';
import {ShieldAlert,Plus,UploadCloud,Loader2,AlertCircle,Zap,ChartNoAxesCombined,CalendarDays,FileText,ListPlus,Timer,CircleCheck,SlidersHorizontal,X,Download,Hourglass,Repeat,Gauge} from 'lucide-react';
import MetricPicker from '@/components/plant/MetricPicker';
import {format} from 'date-fns';
import Sidebar from '@/components/plant/Sidebar';
import Topbar from '@/components/plant/Topbar';
import FocusCards from '@/components/plant/FocusCards';
import OrderTable from '@/components/plant/OrderTable';
import Filters from '@/components/plant/Filters';
import KpiCards from '@/components/plant/KpiCards';
import Charts from '@/components/plant/Charts';
import RangePicker from '@/components/plant/RangePicker';
import WorkCalendar from '@/components/plant/WorkCalendar';
import CalendarDatePanel from '@/components/plant/CalendarDatePanel';
import OrderDrawer from '@/components/plant/OrderDrawer';
import ImportDialog from '@/components/plant/ImportDialog';
import WorkspaceSettings from '@/components/plant/WorkspaceSettings';
import ProfileModal from '@/components/plant/ProfileModal';
import BreakInLogger from '@/components/plant/BreakInLogger';
import ShiftSummary from '@/components/plant/ShiftSummary';
import ItemMasterPage from '@/components/plant/ItemMasterPage';
import SystemRegistryPage from '@/components/plant/SystemRegistryPage';
import PMFocus from '@/components/plant/PMFocus';
import PMAnalytics from '@/components/plant/PMAnalytics';
import PMCalendarFilter from '@/components/plant/PMCalendarFilter';
import SLAAgingStrip from '@/components/plant/SLAAgingStrip';
import TodayBreakInList from '@/components/plant/TodayBreakInList';
import ShortcutCards from '@/components/plant/ShortcutCards';

import MiniCalendar from '@/components/plant/MiniCalendar';
import NotificationCenter from '@/components/plant/NotificationCenter';
import useAlertSettings from '@/components/plant/useAlertSettings';
import usePlantWorkspace from '@/components/plant/usePlantWorkspace';
import {toast} from '@/components/ui/use-toast';
import {today,aged,rangeFor,inRange,greeting,units,statuses,isBacklog,backlogCategory,exportBreakInsCSV,exportAllWorkOrdersCSV,exportPMCSV} from '@/components/plant/plantUtils';
import usePrefs from '@/components/plant/usePrefs';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';

const adminTabs=['settings','items','systems'];
const titles={focus:"Today's Focus",orders:'Work Orders',breakins:'Break-In Hub',pm:'Preventive Maintenance',pmcalendar:'PM Calendar',pmfocus:"PM Today's Focus",pmanalytics:'PM Analytics',analytics:'Performance Analytics',calendar:'Work Calendar',settings:'Workspace Settings',items:'Item Master',systems:'System Registry'};


export default function PlantDesk(){
  const ws=usePlantWorkspace();
  const {settings:alertSettings}=useAlertSettings(ws.workspace);
  // Shortcuts, analytics metrics and default views, kept per user across devices.
  const [prefs,updatePrefs]=usePrefs(ws.workspace);

  const [tab,setTab]=useState('focus'),[sidebarOpen,setSidebarOpen]=useState(()=>window.innerWidth>768),[workspaceMode,setWorkspaceMode]=useState('cm'),[pmDateFrom,setPmDateFrom]=useState(''),[pmDateTo,setPmDateTo]=useState('');
  const [filters,setFilters]=useState({}),[search,setSearch]=useState('');
  const [analyticsFilters,setAnalyticsFilters]=useState({});
  const [backlogTableFilter,setBacklogTableFilter]=useState(null);
  const [period,setPeriod]=useState('This Month'),[range,setRange]=useState(rangeFor('This Month'));
  const [drawerJob,setDrawerJob]=useState(null),[importOpen,setImportOpen]=useState(false),[importMode,setImportMode]=useState('cm'),[profileOpen,setProfileOpen]=useState(false),[loggerOpen,setLoggerOpen]=useState(false),[summaryOpen,setSummaryOpen]=useState(false),[breakInDate,setBreakInDate]=useState(''),[breakInGroup,setBreakInGroup]=useState('date'),[calendarDate,setCalendarDate]=useState(null),[summaryDate,setSummaryDate]=useState(''),[summaryScope,setSummaryScope]=useState('cm');

  useEffect(()=>{if(!ws.admin&&adminTabs.includes(tab))setTab('focus');},[ws.admin,tab]);
  useEffect(()=>{document.title=`${titles[tab]||'Plant Desk'} | ICMS ProMax`;},[tab]);

  // Strict table separation: every list reads from exactly one source table.
  const isCM=j=>j._table==='cm_orders';
  const isBreakIn=j=>j._table==='breakin_orders';
  const isPM=j=>j._table==='pm_orders';
  const cmOrders=useMemo(()=>ws.orders.filter(j=>isCM(j)||isBreakIn(j)),[ws.orders]);
  const cmOnlyCount=useMemo(()=>ws.orders.filter(isCM).length,[ws.orders]);
  const filtered=useMemo(()=>{
    let r=cmOrders;
    if(filters.search||search)r=r.filter(j=>{const q=(filters.search||search).toLowerCase();return j.wo_number?.toLowerCase().includes(q)||j.description?.toLowerCase().includes(q)||j.equipment_tag?.toLowerCase().includes(q)||j.technician?.toLowerCase().includes(q);});
    if(filters.today){const t=today(),d=v=>v?String(v).slice(0,10):'';r=r.filter(j=>d(j.planned_start)===t||d(j.start_time)===t||d(j.created_date)===t||d(j.completion_time)===t);}
    if(filters.system)r=r.filter(j=>j.system===filters.system);
    if(filters.unit)r=r.filter(j=>j.unit===filters.unit);
    if(filters.job_type)r=r.filter(j=>j.job_type===filters.job_type);
    if(filters.priority)r=r.filter(j=>j.priority===filters.priority);
    if(filters.maintenance_type)r=r.filter(j=>(j.maintenance_type||'CM')===filters.maintenance_type);
    if(filters.backlog)r=r.filter(j=>isBacklog(j)&&backlogCategory(j)===filters.backlog);
    if(filters.status==='Aged')r=r.filter(j=>aged(j)>0);
    else if(filters.status==='Backlog')r=r.filter(isBacklog);
    else if(filters.status==='Active / Deferred')r=r.filter(j=>['In-Progress','Deferred'].includes(j.status));
    else if(filters.statuses)r=r.filter(j=>filters.statuses.includes(j.status));
    else if(filters.status)r=r.filter(j=>j.status===filters.status);
    if(filters.technician)r=r.filter(j=>j.technician===filters.technician);
    return r;
  },[cmOrders,filters,search]);

  const rangeOrders=useMemo(()=>cmOrders.filter(j=>inRange(j,range)),[cmOrders,range]);
  const analyticsOrders=useMemo(()=>{
    let r=rangeOrders;
    if(analyticsFilters.unit)r=r.filter(j=>j.unit===analyticsFilters.unit);
    if(analyticsFilters.priority)r=r.filter(j=>j.priority===analyticsFilters.priority);
    if(analyticsFilters.system)r=r.filter(j=>j.system===analyticsFilters.system);
    return r;
  },[rangeOrders,analyticsFilters]);
  const backlogTableOrders=useMemo(()=>{
    const backlog=analyticsOrders.filter(j=>j.status!=='Completed');
    if(!backlogTableFilter)return backlog;
    const {type,value}=backlogTableFilter;
    if(type==='category')return backlog.filter(j=>isBacklog(j)&&backlogCategory(j)===value);
    if(type==='unassigned')return backlog.filter(j=>!String(j.technician||'').trim());
    if(type==='aged')return backlog.filter(j=>aged(j)>0);
    if(type==='priority')return backlog.filter(j=>j.priority===value);
    if(type==='status')return backlog.filter(j=>j.status===value);
    if(type==='job_type')return backlog.filter(j=>j.job_type===value);
    if(type==='shutdown')return backlog.filter(j=>j.shutdown_item);
    if(type==='oldest'){
      const ages=backlog.map(j=>({job:j,age:Number(j.planned_start||j.created_date?Math.max(0,Math.floor((Date.now()-new Date((j.planned_start||j.created_date).slice(0,10)+'T12:00:00').getTime())/86400000)):0)}));
      const maxAge=Math.max(0,...ages.map(x=>x.age));
      return ages.filter(x=>x.age===maxAge).map(x=>x.job);
    }
    return backlog;
  },[analyticsOrders,backlogTableFilter]);
  const breakIns=useMemo(()=>filtered.filter(isBreakIn),[filtered]);
  const scheduledOrders=useMemo(()=>filtered.filter(isCM),[filtered]);
  const pmOrders=useMemo(()=>ws.orders.filter(isPM),[ws.orders]);
  const pmRangeOrders=useMemo(()=>pmOrders.filter(j=>inRange(j,range)),[pmOrders,range]);
  const breakInsForDate=useMemo(()=>breakInDate?breakIns.filter(j=>j.planned_start===breakInDate||(j.completion_time&&j.completion_time.slice(0,10)===breakInDate)):breakIns,[breakIns,breakInDate]);
  const allBreakInCount=useMemo(()=>ws.orders.filter(isBreakIn).length,[ws.orders]);
  const breakInGroups=useMemo(()=>{
    const keyOf=(j)=>{
      const raw=j.planned_start||(j.completion_time||'').slice(0,10)||(j.created_date||'').slice(0,10);
      if(!raw) return {k:'none',label:'No date'};
      const d=new Date(raw+'T12:00:00');
      if(breakInGroup==='month') return {k:format(d,'yyyy-MM'),label:format(d,'MMMM yyyy')};
      if(breakInGroup==='week'){
        const s2=new Date(d);s2.setDate(d.getDate()-d.getDay());
        const e2=new Date(s2);e2.setDate(s2.getDate()+6);
        return {k:format(s2,'yyyy-MM-dd'),label:`Week of ${format(s2,'dd MMM')} – ${format(e2,'dd MMM yyyy')}`};
      }
      return {k:format(d,'yyyy-MM-dd'),label:format(d,'EEEE, dd MMM yyyy')};
    };
    const map=new Map();
    breakInsForDate.forEach(j=>{const {k,label}=keyOf(j);if(!map.has(k))map.set(k,{key:k,label,jobs:[]});map.get(k).jobs.push(j);});
    return [...map.values()].sort((a,b)=>a.key<b.key?1:-1);
  },[breakInsForDate,breakInGroup]);
  const openDrawer=(job)=>setDrawerJob(job||{job_type:'Scheduled',status:'Open',priority:'Medium',materials:[],unit:'Unit 1',maintenance_type:'CM'});
  const createJob=(type)=>setDrawerJob({job_type:type,status:'Open',priority:'Medium',materials:[],unit:'Unit 1',maintenance_type:'CM'});
  const createPM=()=>setDrawerJob({job_type:'Scheduled',status:'Open',priority:'Medium',materials:[],unit:'Unit 1',maintenance_type:'PM',pm_frequency:'Monthly'});
  const addForDate=(date)=>setDrawerJob({job_type:'Scheduled',status:'Open',priority:'Medium',materials:[],unit:'Unit 1',planned_start:date});
  const addPMForDate=(date)=>setDrawerJob({job_type:'Scheduled',status:'Open',priority:'Medium',materials:[],unit:'Unit 1',maintenance_type:'PM',pm_frequency:'Monthly',planned_start:date});
  const drill=(f)=>{setFilters(f);setTab('orders');};
  // Every CSV export reports what happened instead of silently doing nothing.
  const runExport=(fn,rows,label)=>{
    try{
      const n=fn(rows||[]);
      if(n)toast({title:`${label} exported`,description:`${n} row${n===1?'':'s'} downloaded.`});
      else toast({title:'Nothing to export',description:'No rows match the current view.',variant:'destructive'});
    }catch(e){toast({title:'Export failed',description:e?.message||'Please try again.',variant:'destructive'});}
  };
  const openImport=(mode)=>{setImportMode(mode);setImportOpen(true);};

  const greetingText=()=>{const g=greeting();const name=ws.profileName?.split(' ')[0]||'Supervisor';const desig=ws.workspace?.designation;const plant=ws.workspace?.plant;if(desig&&plant)return `${g}, ${name} — ${desig}, ${plant}`;if(desig)return `${g}, ${name} — ${desig}`;return `${g}, ${name}!`;};
  const subtitle=ws.workspace?.shift?`Shift: ${ws.workspace.shift} · ${format(new Date(),'EEEE, dd MMMM yyyy')}`:`Here is your shift breakdown for ${format(new Date(),'EEEE, dd MMMM yyyy')}.`;

  if(ws.loading&&!ws.workspace)return <div className="full-loader"><Loader2 className="animate-spin" size={28}/><p>Initializing your workspace…</p></div>;
  if(ws.error&&!ws.workspace)return <div className="full-loader error"><AlertCircle size={28}/><p>{ws.error}</p></div>;

  const systemOptions=ws.systems&&ws.systems.length?[...new Set(ws.systems.map(s=>s.system_name).filter(Boolean))]:[];

  return <div className="plant-shell">
    <Sidebar tab={tab} onTab={setTab} workspaces={ws.workspaces} workspace={ws.workspace} onWorkspace={ws.chooseWorkspace} user={ws.user} admin={ws.admin} open={sidebarOpen} onClose={()=>setSidebarOpen(false)} count={cmOnlyCount} pmCount={pmOrders.length} breakInCount={allBreakInCount} onProfile={ws.admin?()=>setProfileOpen(true):undefined} profileName={ws.profileName} workspaceMode={workspaceMode} onSwitchMode={m=>{setWorkspaceMode(m);setFilters({});setTab(m==='pm'?'pmfocus':'focus');}}/>
    <div className={`plant-main ${sidebarOpen?'':'sidebar-hidden'}`}>
      <Topbar title={titles[tab]} onMenu={()=>setSidebarOpen(v=>!v)} search={search} onSearch={setSearch} onTab={setTab} clockFormat={ws.workspace?.clock_format||'12'}/>
      <div className="plant-content">
        {ws.error&&<div className="content-error"><AlertCircle size={16}/>{ws.error}</div>}
        {tab==='focus'&&<><div className="page-header"><div><h1>{greetingText()}</h1><p>{subtitle}</p></div><div className="page-actions">{ws.admin&&<button className="secondary-button" onClick={()=>{setSummaryScope('cm');setSummaryDate('');setSummaryScope('cm');setSummaryOpen(true);}}><FileText size={16}/>CM Shift Report</button>}<NotificationCenter orders={ws.orders} items={ws.items} settings={alertSettings} onOpenJob={openDrawer} onGoToPM={()=>setTab('pm')} onGoToItems={ws.admin?()=>setTab('items'):undefined}/><button className="secondary-button" onClick={()=>openImport('cm')}><UploadCloud size={16}/>Import</button><button className="primary-button" onClick={()=>createJob('Scheduled')}><Plus size={16}/>Add work order</button></div></div><FocusCards orders={cmOrders} onOpen={openDrawer} onCreate={createJob} onView={f=>{setFilters(f);setTab('orders');}}/><SLAAgingStrip orders={cmOrders} onView={f=>{setFilters(f);setTab('orders');}}/><div className="focus-2x2-grid"><TodayBreakInList orders={cmOrders} onOpen={openDrawer}/><ShortcutCards onTab={setTab} onLogger={()=>setLoggerOpen(true)} onCreate={createJob} onFilter={drill} admin={ws.admin} shortcuts={prefs.shortcuts} onChange={v=>updatePrefs({shortcuts:v})}/><MiniCalendar workspace={ws.workspace}/></div></>}
        {tab==='orders'&&<><div className="page-header"><div><h1>Work Order Register</h1><p>Scheduled corrective work in {ws.workspace?.name}. Break-in jobs live in the Break-In Hub.</p></div><div className="page-actions"><button className="secondary-button" onClick={()=>runExport(exportAllWorkOrdersCSV,scheduledOrders,'Work orders')} disabled={!scheduledOrders.length}><Download size={16}/>Export All to CSV</button><button className="secondary-button" onClick={()=>openImport('cm')}><UploadCloud size={16}/>Import</button><button className="primary-button" onClick={()=>createJob('Scheduled')}><Plus size={16}/>Add work order</button></div></div><Filters filters={filters} setFilters={setFilters} orders={ws.orders} systems={ws.systems}/><OrderTable orders={scheduledOrders} onOpen={openDrawer} workspace={ws.workspace} admin={ws.admin} onRefresh={ws.refresh}/></>}
        {tab==='breakins'&&<><div className="page-header"><div><h1>Break-In Hub</h1><p>Unscheduled jobs raised without an official WO number.</p></div><div className="page-actions"><button className="secondary-button" onClick={()=>runExport(exportBreakInsCSV,breakInsForDate,'Break-ins')} disabled={!breakInsForDate.length}><Download size={16}/>Export CSV</button>{ws.admin&&<button className="secondary-button" onClick={()=>openImport('breakin')}><UploadCloud size={16}/>Import Break-Ins</button>}<button className="secondary-button" onClick={()=>{setSummaryScope('breakin');setSummaryDate(breakInDate||'');setSummaryScope('breakin');setSummaryOpen(true);}}><FileText size={16}/>Generate Report</button><button className="secondary-button" onClick={()=>setLoggerOpen(true)}><ListPlus size={16}/>Fast logger</button><button className="primary-button" onClick={()=>createJob('Break-In')}><Zap size={16}/>Add break-in job</button></div></div>
        <div className="breakin-toolbar"><label className="form-field" style={{flexDirection:'row',alignItems:'center',gap:6,margin:0}}>Date<input type="date" value={breakInDate} onChange={e=>setBreakInDate(e.target.value)}/></label><span className="breakin-group-label">Group by</span><Select value={breakInGroup} onValueChange={setBreakInGroup}><SelectTrigger className="w-[150px] h-9"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="date">Daily</SelectItem><SelectItem value="week">Weekly</SelectItem><SelectItem value="month">Monthly</SelectItem></SelectContent></Select><span className="breakin-group-label" style={{marginLeft:'auto'}}>{breakInsForDate.length} break-in job{breakInsForDate.length===1?'':'s'}</span></div>
        {breakInsForDate.length?breakInGroups.map(g=><div className="breakin-group" key={g.key}><OrderTable orders={g.jobs} title={`${g.label} · ${g.jobs.length} job${g.jobs.length===1?'':'s'}`} onOpen={openDrawer} workspace={ws.workspace} admin={ws.admin} onRefresh={ws.refresh}/></div>):<div className="empty-state"><Zap size={32}/><h3>{breakInDate?'No break-ins for selected date':'No break-in jobs recorded'}</h3><p>{breakInDate?'Try a different date or clear the filter.':'When emergency work arises, capture it instantly — no official WO number required.'}</p><div style={{display:'flex',gap:8}}>{ws.admin&&<button className="secondary-button" onClick={()=>openImport('breakin')}><UploadCloud size={16}/>Import Excel</button>}<button className="secondary-button" onClick={()=>setLoggerOpen(true)}><ListPlus size={16}/>Fast logger</button><button className="primary-button" onClick={()=>createJob('Break-In')}><Plus size={16}/>Add break-in job</button></div></div>}</>}
        {tab==='pm'&&<><div className="page-header"><div><h1>Preventive Maintenance</h1><p>Recurring PM schedule. Completing a PM auto-generates the next instance.</p></div><div className="page-actions"><button className="secondary-button" onClick={()=>runExport(exportPMCSV,pmOrders,'PM schedule')} disabled={!pmOrders.length}><Download size={16}/>Export CSV</button><button className="secondary-button" onClick={()=>openImport('pm')}><UploadCloud size={16}/>Import CSV</button><button className="secondary-button" onClick={()=>{setSummaryScope('pm');setSummaryDate('');setSummaryScope('pm');setSummaryOpen(true);}}><FileText size={16}/>PM Shift Report</button><button className="primary-button" onClick={createPM}><Repeat size={16}/>Add PM job</button></div></div><div className="kpi-grid">{[{label:'Total PM Jobs',count:pmOrders.length,icon:Repeat,color:'violet'},{label:'Open PM',count:pmOrders.filter(j=>j.status==='Open').length,icon:Timer,color:'blue'},{label:'In Progress',count:pmOrders.filter(j=>j.status==='In-Progress').length,icon:Loader2,color:'amber'},{label:'Completed',count:pmOrders.filter(j=>j.status==='Completed').length,icon:CircleCheck,color:'green'}].map(k=><div key={k.label} className="kpi-card"><div className="kpi-top"><span>{k.label}</span><span className={`kpi-icon ${k.color}`}><k.icon size={17}/></span></div><div className="kpi-value">{k.count}</div><div className={`kpi-bottom ${k.color}`}/></div>)}</div><PMCalendarFilter from={pmDateFrom} to={pmDateTo} onChange={(f,t)=>{setPmDateFrom(f);setPmDateTo(t);}}/><Filters filters={filters} setFilters={setFilters} orders={pmOrders} systems={ws.systems}/><OrderTable orders={pmOrders.filter(j=>{if(pmDateFrom&&j.planned_start&&j.planned_start<pmDateFrom)return false;if(pmDateTo&&j.planned_start&&j.planned_start>pmDateTo)return false;if(filters.system&&j.system!==filters.system)return false;if(filters.unit&&j.unit!==filters.unit)return false;if(filters.status&&j.status!==filters.status)return false;if(filters.search){const q=filters.search.toLowerCase();return j.wo_number?.toLowerCase().includes(q)||j.description?.toLowerCase().includes(q);}return true;})} onOpen={openDrawer} title="Preventive Maintenance Schedule" workspace={ws.workspace} admin={ws.admin} onRefresh={ws.refresh}/></>}
        {tab==='analytics'&&<><div className="page-header"><div><h1>Performance Analytics</h1><p>Executive view of plant execution for {period}.</p></div><div className="page-actions"><button className={prefs.supervisorMode?'primary-button':'secondary-button'} onClick={()=>updatePrefs({supervisorMode:!prefs.supervisorMode})} title="Show only the essential metrics"><Gauge size={16}/>{prefs.supervisorMode?'Supervisor view on':'Supervisor view'}</button><button className="secondary-button" onClick={()=>{setSummaryScope('cm');setSummaryDate('');setSummaryScope('cm');setSummaryOpen(true);}}><FileText size={16}/>CM Shift Report</button><RangePicker period={period} setPeriod={setPeriod} range={range} setRange={setRange}/></div></div><div className="filter-toolbar"><div className="filter-selects"><SlidersHorizontal size={15}/><select aria-label="Filter by unit" value={analyticsFilters.unit||''} onChange={e=>setAnalyticsFilters(p=>({...p,unit:e.target.value||undefined}))}><option value="">All Units</option>{units.map(u=><option key={u}>{u}</option>)}</select><select aria-label="Filter by priority" value={analyticsFilters.priority||''} onChange={e=>setAnalyticsFilters(p=>({...p,priority:e.target.value||undefined}))}><option value="">All Priorities</option>{['Critical','High','Medium','Low'].map(p=><option key={p}>{p}</option>)}</select><select aria-label="Filter by system" value={analyticsFilters.system||''} onChange={e=>setAnalyticsFilters(p=>({...p,system:e.target.value||undefined}))}><option value="">All Systems</option>{[...new Set([...systemOptions,...ws.orders.map(j=>j.system).filter(Boolean)])].map(s=><option key={s}>{s}</option>)}</select>{Object.values(analyticsFilters).some(Boolean)&&<button className="icon-button" aria-label="Clear analytics filters" onClick={()=>setAnalyticsFilters({})}><X size={15}/></button>}<MetricPicker metrics={prefs.analyticsMetrics} onMetrics={v=>updatePrefs({analyticsMetrics:v})}/></div></div><KpiCards orders={analyticsOrders} pmOrders={pmRangeOrders} onDrill={drill} metrics={prefs.analyticsMetrics} supervisorMode={prefs.supervisorMode} ratioPeriod={prefs.ratioPeriod}/><Charts orders={analyticsOrders} onDrill={drill} onBacklogFilter={setBacklogTableFilter} activeBacklogFilter={backlogTableFilter} supervisorMode={prefs.supervisorMode} defaultMetric={prefs.workVolumeDefault} onDefaultMetric={v=>updatePrefs({workVolumeDefault:v})}/><OrderTable orders={backlogTableOrders} onOpen={openDrawer} title="Work Orders in Range" limited workspace={ws.workspace} admin={ws.admin} onRefresh={ws.refresh} activeFilter={backlogTableFilter?.label||'Active backlog'} onClearFilter={backlogTableFilter?()=>setBacklogTableFilter(null):undefined}/></>}
        {tab==='calendar'&&<><div className="page-header"><div><h1>Work Calendar</h1><p>Click any date to add a work order. Planned and completed work across your plant.</p></div><div className="page-actions"><button className="primary-button" onClick={()=>createJob('Scheduled')}><Plus size={16}/>Add work order</button></div></div><WorkCalendar orders={cmOrders} onDateSelect={setCalendarDate}/></>}
        {tab==='pmfocus'&&<><div className="page-header"><div><h1>{greetingText()}</h1><p>{subtitle}</p></div><div className="page-actions">{ws.admin&&<button className="secondary-button" onClick={()=>{setSummaryScope('pm');setSummaryDate('');setSummaryScope('pm');setSummaryOpen(true);}}><FileText size={16}/>PM Shift Report</button>}<NotificationCenter orders={ws.orders} items={ws.items} settings={alertSettings} defaultCategory="preventive" onOpenJob={openDrawer} onGoToPM={()=>setTab('pm')} onGoToItems={ws.admin?()=>setTab('items'):undefined}/><button className="secondary-button" onClick={()=>openImport('pm')}><UploadCloud size={16}/>Import</button><button className="primary-button" onClick={createPM}><Repeat size={16}/>Add PM job</button></div></div><PMFocus pmOrders={pmOrders} onOpen={openDrawer} onCreate={createPM}/></>}{tab==='pmanalytics'&&<><div className="page-header"><div><h1>PM Analytics</h1><p>Preventive maintenance performance, 80/20 ratio, and recurrence compliance.</p></div></div><PMAnalytics pmOrders={pmOrders} cmOrders={cmOrders} onDrill={f=>{setFilters(f);setTab('pm');}}/></>}{tab==='pmcalendar'&&<><div className="page-header"><div><h1>PM Calendar</h1><p>Dedicated Preventive Maintenance schedule. Full job descriptions shown — no truncation.</p></div><div className="page-actions"><button className="primary-button" onClick={createPM}><Repeat size={16}/>Add PM job</button></div></div><WorkCalendar orders={pmOrders} onDateSelect={setCalendarDate} pmMode/></>}
        {adminTabs.includes(tab)&&!ws.admin&&<div className="empty-state"><ShieldAlert size={32}/><h3>Administrator access required</h3><p>Item Master, System Registry and Workspace Settings are restricted to workspace administrators.</p><button className="primary-button" onClick={()=>setTab('focus')}>Back to Today's Focus</button></div>}
        {tab==='items'&&ws.admin&&<ItemMasterPage workspace={ws.workspace} items={ws.items} onSaved={ws.refresh}/>}
        {tab==='systems'&&ws.admin&&<SystemRegistryPage workspace={ws.workspace} systems={ws.systems} orders={ws.orders} onSaved={ws.refresh}/>}
        {tab==='settings'&&ws.admin&&<><div className="page-header"><div><h1>Workspace Settings</h1><p>Manage your plant workspace and field user access.</p></div></div><WorkspaceSettings workspace={ws.workspace} onSaved={ws.refreshSettings}/></>}
      </div>
    </div>
    {drawerJob&&<OrderDrawer job={drawerJob} workspace={ws.workspace} admin={ws.admin} systems={ws.systems} onClose={()=>setDrawerJob(null)} onSaved={ws.refresh}/>}
    {importOpen&&ws.admin&&<ImportDialog workspace={ws.workspace} mode={importMode} onClose={()=>setImportOpen(false)} onSaved={ws.refresh}/>}
    {profileOpen&&ws.admin&&<ProfileModal workspace={ws.workspace} user={ws.user} onClose={()=>setProfileOpen(false)} onSaved={ws.refreshSettings}/>}
    {loggerOpen&&<BreakInLogger workspace={ws.workspace} onClose={()=>setLoggerOpen(false)} onSaved={ws.refresh}/>}
    {summaryOpen&&<ShiftSummary orders={summaryScope==='breakin'?breakIns:summaryScope==='pm'?pmOrders:cmOrders} scope={summaryScope} workspace={ws.workspace} defaultDate={summaryDate} onClose={()=>setSummaryOpen(false)}/>}
    {calendarDate&&<CalendarDatePanel date={calendarDate} orders={tab==='pmcalendar'?pmOrders:cmOrders} workspace={ws.workspace} onClose={()=>setCalendarDate(null)} onAddNew={date=>{setCalendarDate(null);tab==='pmcalendar'?addPMForDate(date):addForDate(date);}} onOpen={j=>{setCalendarDate(null);openDrawer(j);}} onGenerateReport={date=>{setSummaryScope(tab==='pmcalendar'?'pm':'cm');setSummaryScope(tab==='pmcalendar'?'pm':'cm');setSummaryDate(date);setSummaryOpen(true);setCalendarDate(null);}} onRescheduled={()=>{setCalendarDate(null);ws.refresh();}}/>}
  </div>;
}