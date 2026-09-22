import {useState,useEffect,useRef,useCallback} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {api,errorText} from '@/components/plant/plantUtils';
export default function usePlantWorkspace() {
 const [user,setUser]=useState(null),[workspaces,setWorkspaces]=useState([]),[workspace,setWorkspace]=useState(null),[orders,setOrders]=useState([]),[systems,setSystems]=useState([]),[items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[profileName,setProfileName]=useState('');
 const wsId=workspace?.id;
 const initialize=async()=>{const r=await api('initialize');setUser(r.user);setProfileName(r.user?.name||'');setWorkspaces(r.workspaces);return r;};
 useEffect(()=>{let live=true;(async()=>{try{const r=await initialize();if(live)setWorkspace(r.workspaces[0]);}catch(e){if(live){setError(errorText(e));setLoading(false);}}})();return()=>{live=false;};},[]);
 useEffect(()=>{if(!workspace)return;let live=true;setLoading(true);setOrders([]);setError('');api('list',{workspace_id:workspace.id}).then(r=>{if(live)setOrders(r.orders);}).catch(e=>{if(live)setError(errorText(e));}).finally(()=>{if(live)setLoading(false);});api('listSystems',{workspace_id:workspace.id}).then(r=>{if(live)setSystems(r.systems);}).catch(()=>{});api('listItems',{workspace_id:workspace.id}).then(r=>{if(live)setItems(r.items);}).catch(()=>{});return()=>{live=false;};},[workspace?.id]);
 const refresh=useCallback(async()=>{if(!wsId)return;const r=await api('list',{workspace_id:wsId});setOrders(r.orders);},[wsId]);
 const refreshSettings=async()=>{const r=await initialize();setWorkspace(r.workspaces.find(w=>w.id===workspace.id));};

 // Live sync: pick up every insert / update / delete made anywhere (another
 // tab, another device, a teammate) without the user pressing refresh.
 const timer=useRef(null);
 useEffect(()=>{
  if(!wsId)return;
  let live=true;
  const pull=()=>{
   if(timer.current)clearTimeout(timer.current);
   timer.current=setTimeout(()=>{if(live)api('list',{workspace_id:wsId}).then(r=>{if(live)setOrders(r.orders);}).catch(()=>{});},350);
  };
  const channel=supabase.channel(`plant-live-${wsId}`);
  ['work_orders','system_registry','item_master'].forEach(table=>{
   channel.on('postgres_changes',{event:'*',schema:'public',table,filter:`workspace_id=eq.${wsId}`},()=>{
    if(table==='work_orders')pull();
    else if(table==='system_registry')api('listSystems',{workspace_id:wsId}).then(r=>{if(live)setSystems(r.systems);}).catch(()=>{});
    else api('listItems',{workspace_id:wsId}).then(r=>{if(live)setItems(r.items);}).catch(()=>{});
   });
  });
  channel.subscribe();
  // Safety net for projects where live database updates are switched off.
  const poll=setInterval(pull,45000);
  const onFocus=()=>pull();
  window.addEventListener('focus',onFocus);
  document.addEventListener('visibilitychange',onFocus);
  return()=>{
   live=false;
   if(timer.current)clearTimeout(timer.current);
   clearInterval(poll);
   window.removeEventListener('focus',onFocus);
   document.removeEventListener('visibilitychange',onFocus);
   supabase.removeChannel(channel);
  };
 },[wsId]);

   return {user,workspaces,workspace,orders,systems,items,loading,error,refresh,refreshSettings,chooseWorkspace:id=>setWorkspace(workspaces.find(w=>w.id===id)),admin:workspace?.owner_id===user?.id,profileName};
}
