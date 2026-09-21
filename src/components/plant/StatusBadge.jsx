import React from 'react';
const CLASSES={'Open':'status-open','In-Progress':'status-progress','Pending Parts':'status-parts','Completed':'status-completed','Deferred':'status-deferred','Cancelled':'status-cancelled'};
export default function StatusBadge({status}) {return <span className={`status-badge ${CLASSES[status]||'status-open'}`}><i/>{status==='In-Progress'?'In Progress':status}</span>;}
