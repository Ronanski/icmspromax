import React,{useState} from 'react';
import {UploadCloud,Loader2,CheckCircle} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {api,errorText,parseCSV} from '@/components/plant/plantUtils';
import {useToast} from '@/components/ui/use-toast';
export default function MasterImportDialog({workspace,action,onClose,onSaved}) {
  const [busy,setBusy]=useState(false),[result,setResult]=useState(null),[error,setError]=useState('');
  const {toast}=useToast();
  const handleFile=async(file)=>{
    if(!file)return;
    if(!file.name.match(/\.csv$/i)){setError('Please upload a .csv file');return;}
    setBusy(true);setError('');setResult(null);
    try{
      const text=await file.text();
      const rows=parseCSV(text);
      if(!rows.length)throw Error('No data rows found in CSV');
      const res=await api(action,{workspace_id:workspace.id,rows});
      setResult(res);
      await onSaved();
      toast({title:'Import complete',description:`${res.created||0} created · ${res.updated||0} updated`});
    }catch(e){
      const msg=errorText(e);
      setError(msg);
      toast({title:'Import failed',description:msg,variant:'destructive'});
    }finally{setBusy(false);}
  };
  return <Dialog open onOpenChange={onClose}><DialogContent className="master-dialog">
    <DialogTitle>Import CSV</DialogTitle>
    <DialogDescription>Upload a CSV file to batch-import records. Duplicate codes/names will update existing records.</DialogDescription>
    {result?(
      <div className="import-success">
        <CheckCircle size={40}/>
        <h3>Import Complete</h3>
        <p>{result.created} created · {result.updated} updated</p>
        <button className="primary-button" onClick={onClose}>Done</button>
      </div>
    ):(
      <>
        <label className={`upload-zone${busy?' busy':''}`}>
          <input type="file" accept=".csv" className="hidden" onChange={e=>handleFile(e.target.files?.[0])}/>
          {busy?<Loader2 className="animate-spin" size={32}/>:<UploadCloud size={32}/>}
          <strong>{busy?'Importing…':'Click to select a CSV file'}</strong>
          <span>Max 500 rows · duplicates update existing records</span>
        </label>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button>
        </div>
      </>
    )}
  </DialogContent></Dialog>;
}