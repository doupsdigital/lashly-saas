import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PerfilCliente() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-6 bg-surface border rounded-[14px]">
      <div className="mb-4">
        <Link 
          to="/clientes" 
          className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Clientes
        </Link>
      </div>
      <h2 className="text-3xl font-title font-semibold text-text-primary mb-2">Perfil do Cliente</h2>
      <p className="text-text-secondary">Identificador do Cliente: <code className="bg-bg px-2 py-1 rounded text-xs">{id}</code></p>
      <p className="text-text-muted mt-4">Esta página será implementada com a ficha de anamnese e histórico completo na próxima etapa.</p>
    </div>
  );
}
