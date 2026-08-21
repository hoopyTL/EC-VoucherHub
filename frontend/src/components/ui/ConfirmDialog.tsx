import { Button } from './Button'
import { Modal } from './Modal'

export function ConfirmDialog({open,title,message,confirmLabel='Đồng ý',cancelLabel='Tiếp tục',danger=false,busy=false,onConfirm,onCancel}:{open:boolean;title:string;message:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean;busy?:boolean;onConfirm:()=>void;onCancel:()=>void}) {
  return <Modal isOpen={open} onClose={onCancel} title={title} size='sm' footer={<><Button variant='secondary' onClick={onCancel} disabled={busy}>{cancelLabel}</Button><Button variant={danger?'danger':'primary'} onClick={onConfirm} isLoading={busy}>{confirmLabel}</Button></>}><p style={{margin:0,lineHeight:1.65}}>{message}</p></Modal>
}
