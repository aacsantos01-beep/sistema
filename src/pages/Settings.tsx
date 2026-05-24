import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Upload, Save, Building, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { API_URL, BASE_URL } from '../config';
import './Settings.css';

const Settings: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.company_name) setCompanyName(data.company_name);
      if (data.company_logo) setLogo(data.company_logo);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setLogo(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      
      // Update Company Name
      await fetch(`${API_URL}/settings/company-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: companyName })
      });

      // Update Logo if selected
      if (file) {
        const formData = new FormData();
        formData.append('logo', file);
        await fetch(`${API_URL}/settings/logo`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      alert('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Gerenciamento">
      <div className="settings-container">
        <div className="card settings-card">
          <div className="card-header">
            <h3>Dados da Empresa</h3>
          </div>
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <label><Building size={16} /> Nome da Empresa</label>
              <input 
                type="text" 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)} 
                placeholder="Ex: IR Assistência Técnica"
              />
            </div>

            <div className="form-group">
              <label><ImageIcon size={16} /> Logo da Empresa</label>
              <div className="logo-upload-container">
                <div className="logo-preview">
                  {logo ? (
                    <img src={logo.startsWith('blob') ? logo : `${BASE_URL}${logo}`} alt="Logo preview" />
                  ) : (
                    <div className="no-logo">Sem Logo</div>
                  )}
                </div>
                <div className="upload-controls">
                  <label htmlFor="logo-upload" className="btn btn-secondary upload-btn">
                    <Upload size={18} /> Selecionar Logo
                  </label>
                  <input 
                    id="logo-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange} 
                    hidden 
                  />
                  <p className="help-text">Recomendado: PNG ou JPG, 300x300px</p>
                </div>
              </div>
            </div>

            <div className="settings-footer">
              <button type="submit" className="btn btn-primary save-btn" disabled={loading}>
                <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              {success && (
                <span className="success-msg">
                  <CheckCircle size={16} /> Configurações salvas!
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
