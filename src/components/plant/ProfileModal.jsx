import db from '@/lib/db';

import React,{useState} from 'react';
import {Save,Loader2,UserCircle} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';

import {api,errorText} from '@/components/plant/plantUtils';
import {toast} from '@/components/ui/use-toast';
export default function ProfileModal({workspace,user,onClose,onSaved}) {
  const [name,setName]=useState(user?.name||''),[designation,setDesignation]=useState(workspace.designation||''),[plantRole,setPlantRole]=useState(workspace.plant_role||''),[shift,setShift]=useState(workspace.shift||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const save=async e=>{e.preventDefault();setBusy(true);setError('');try{if(!name.trim())throw Error('Full name is required');if(name.trim()!==user?.name)await db.auth.updateMe({full_name:name.trim()});await api('profile',{workspace_id:workspace.id,data:{full_name:name.trim(),designation,plant_role:plantRole,shift}});await onSaved();toast({title:'Profile updated'});onClose();}catch(e){const message=errorText(e);setError(message);toast({title:'Profile update failed',description:message,variant:'destructive'});}finally{setBusy(false);}};
  const initials=(name||'Supervisor').slice(0,2).toUpperCase();
  return <Dialog open onOpenChange={v=>!v&&!busy&&onClose()}><DialogContent className="profile-dialog"><DialogTitle className="flex items-center gap-2"><UserCircle size={22}/>Profile & Shift Manager</DialogTitle><DialogDescription>Personalize your workspace greeting and shift identification.</DialogDescription>
    <div className="profile-avatar">{initials}</div>
    <form onSubmit={save}><label className="form-field">Full Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>
      <label className="form-field mt-4">Designation<input placeholder="e.g., I&C Supervisor" value={designation} onChange={e=>setDesignation(e.target.value)}/></label>
      <label className="form-field mt-4">Plant Role<input placeholder="e.g., Shift Supervisor" value={plantRole} onChange={e=>setPlantRole(e.target.value)}/></label>
      <label className="form-field mt-4">Shift Assignment<input placeholder="e.g., Day Shift (06:00–18:00)" value={shift} onChange={e=>setShift(e.target.value)}/></label>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="flex gap-2 mt-4 justify-end"><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} {busy?'Saving…':'Save profile'}</button></div>
    </form>
  </DialogContent></Dialog>;
}