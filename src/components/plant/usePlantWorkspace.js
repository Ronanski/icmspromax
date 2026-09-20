import {useState,useEffect} from 'react';
import {api,errorText} from '@/components/plant/plantUtils';
export default function usePlantWorkspace() {
 const [user,setUser]=useState(null),[workspaces,setWorkspaces]=useState([]),[workspace,setWorkspace]=useState(null),[orders,setOrders]=useState([]),[systems,setSystems]=useState([]),[items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[profileName,setProfileName]=useState(()=>{try{return localStorage.getItem('user_profile_name')||'';}catch{return '';}});
 const initialize=async()=>{const r=await api('initialize');setUser(r.user);setWorkspaces(r.workspaces);return r;};
 useEffect(()=>{let live=true;(async()=>{try{const r=await initialize();if(live)setWorkspace(r.workspaces[0]);}catch(e){if(live){setError(errorText(e));setLoading(false);}}})();return()=>{live=false;};},[]);
 useEffect(()=>{if(!workspace)return;let live=true;setLoading(true);setOrders([]);setError('');api('list',{workspace_id:workspace.id}).then(r=>{if(live)setOrders(r.orders);}).catch(e=>{if(live)setError(errorText(e));}).finally(()=>{if(live)setLoading(false);});api('listSystems',{workspace_id:workspace.id}).then(r=>{if(live)setSystems(r.systems);}).catch(()=>{});api('listItems',{workspace_id:workspace.id}).then(r=>{if(live)setItems(r.items);}).catch(()=>{});return()=>{live=false;};},[workspace?.id]);
 const refresh=async()=>{const r=await api('list',{workspace_id:workspace.id});setOrders(r.orders);};
 const refreshSettings=async()=>{const r=await initialize();setWorkspace(r.workspaces.find(w=>w.id===workspace.id));try{setProfileName(localStorage.getItem('user_profile_name')||'');}catch{}};
   return {user,workspaces,workspace,orders,systems,items,loading,error,refresh,refreshSettings,chooseWorkspace:id=>setWorkspace(workspaces.find(w=>w.id===id)),admin:workspace?.owner_id===user?.id,profileName};
}