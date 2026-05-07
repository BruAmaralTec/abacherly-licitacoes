import { redirect } from 'next/navigation';

// Rota cliente — redireciona para a tela existente.
// (Mantida em /solicitacoes para preservar o código atual; este shim só formaliza a rota /cliente/*.)
export default function ClienteSolicitacoes() {
  redirect('/solicitacoes');
}
