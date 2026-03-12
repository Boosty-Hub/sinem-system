INSERT INTO general_settings (key, value, description)
VALUES ('partners', '["Siemens","NEM Energy","Innomotics","Trench Group"]', 'Lista de partners/proveedores disponibles en CRM y cotizaciones')
ON CONFLICT (key) DO NOTHING;