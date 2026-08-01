import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { Calendar, User, Activity } from 'lucide-react';
import { API_URL } from '../config';
import './ActivityLogs.css';

interface LogEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  create_user: 'Criou usuário',
  update_user: 'Atualizou usuário',
  delete_user: 'Excluiu usuário',
  update_profile_photo: 'Atualizou foto de perfil',
  create_product: 'Criou produto',
  update_product: 'Atualizou produto',
  delete_product: 'Excluiu produto',
  adjust_stock: 'Ajustou estoque',
  create_sale: 'Registrou venda',
  delete_sale: 'Excluiu venda',
  create_budget: 'Criou orçamento',
  delete_budget: 'Excluiu orçamento',
  update_budget_status: 'Alterou status do orçamento',
  create_seller: 'Criou vendedor',
  update_seller: 'Atualizou vendedor',
  delete_seller: 'Removeu vendedor',
  create_payable: 'Criou conta a pagar',
  update_payable: 'Atualizou conta a pagar',
  update_payable_status: 'Alterou status da conta',
  delete_payable: 'Excluiu conta a pagar',
  update_logo: 'Atualizou logo',
  update_company_name: 'Atualizou nome da empresa',
  restore_item: 'Restaurou item da lixeira',
  permanently_delete_item: 'Excluiu item permanentemente',
};

const PAGE_SIZE = 50;

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (actionFilter) params.set('action', actionFilter);

      const response = await fetch(`${API_URL}/activity-logs?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar logs');
      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <Layout title="Log de Atividades">
      <div className="activity-logs-filters">
        <input
          type="text"
          placeholder="Filtrar por ação (ex: login, delete_user)..."
          value={actionFilter}
          onChange={(e) => { setPage(1); setActionFilter(e.target.value); }}
        />
      </div>

      <div className="card">
        {loading ? (
          <p>Carregando...</p>
        ) : logs.length === 0 ? (
          <p className="empty-msg">Nenhuma atividade registrada.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div className="date-cell">
                      <Calendar size={14} />
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </div>
                  </td>
                  <td>
                    <div className="seller-cell">
                      <User size={14} />
                      {log.username || 'Sistema'}
                    </div>
                  </td>
                  <td>
                    <span className="action-badge">
                      <Activity size={14} />
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="details-cell">{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span>Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
        </div>
      )}
    </Layout>
  );
};

export default ActivityLogs;
