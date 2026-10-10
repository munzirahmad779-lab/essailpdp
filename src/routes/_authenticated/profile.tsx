import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { conversationOptions } from '@/lib/conversation-data';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export const Route = createFileRoute('/_authenticated/profile')({
 head:()=>({meta:[{title:'Profil — Wawancara LPDP'},{name:'description',content:'Nama profil peserta latihan LPDP.'},{property:'og:title',content:'Profil — Wawancara LPDP'},{property:'og:description',content:'Nama profil peserta latihan LPDP.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 loader:({context})=>context.queryClient.ensureQueryData(conversationOptions), component:Profile,
});
function Profile(){
 const {data}=useSuspenseQuery(conversationOptions);
 const [name,setName]=useState(data.name);
 const [busy,setBusy]=useState(false);
 const {queryClient}=Route.useRouteContext();
 async function save(){
  setBusy(true);
  const {data:auth}=await supabase.auth.getUser();
  if(auth.user){const {error}=await supabase.from('profiles').update({display_name:name.trim(),updated_at:new Date().toISOString()}).eq('id',auth.user.id);if(error)toast.error(error.message);else {await queryClient.invalidateQueries({queryKey:['conversation']});toast.success('Nama profil tersimpan.');}}
  setBusy(false);
 }
 return <main className="mx-auto w-full max-w-lg px-4 py-8"><h1 className="font-display text-3xl text-primary">Profil Anda</h1><form onSubmit={e=>{e.preventDefault();void save();}} className="mt-6 space-y-4"><label className="block text-sm font-medium">Nama profil<Input required value={name} onChange={e=>setName(e.target.value)} className="mt-2" /></label><Button variant="gold" disabled={busy || !name.trim()} type="submit">Simpan nama</Button></form></main>;
}
