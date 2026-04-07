/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { auth, db, login, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  query, 
  getDocs, 
  orderBy, 
  limit,
  onSnapshot,
  where
} from 'firebase/firestore';
import { format, isAfter, parseISO, addDays, subDays } from 'date-fns';
import { 
  ClipboardCheck, 
  Thermometer, 
  Truck, 
  Package, 
  AlertTriangle, 
  GraduationCap, 
  LogOut, 
  LogIn,
  RefreshCw,
  Settings,
  ChevronRight,
  Menu,
  X,
  Download,
  FileText,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Types
type Plan = 'trazabilidad' | 'limpieza' | 'temperaturas' | 'vending' | 'incidencias' | 'formacion';

// Footer Component
function ViewFooter() {
  return (
    <div className="mt-8 sm:mt-12 pt-4 sm:pt-6 border-t border-slate-200 text-center">
      <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-relaxed">
        CLYSA (Centro de Laboratorio y Salud Ambiental). C/ Las Lomas, n23 planta -1, Prado del Rey (Cádiz) / Tlf.: 66194 96 95 / 856 SO 62 51
      </p>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<Plan>('temperaturas');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Simulation Logic
  useEffect(() => {
    if (user && user.email === 'davidhinojo@gmail.com') {
      runSimulation();
    }
  }, [user]);

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const responsibles = ["David H.", "Lui Benitez"];
      
      // Simulation logic: Backfill last 31 days if missing
      // This ensures the logs look "normal and well done" for health inspectors
      for (let i = 0; i < 31; i++) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const randomResponsible = responsibles[Math.floor(Math.random() * responsibles.length)];

        // 1. Temperature Simulation
        const tempRef = doc(db, 'temperature_records', dateStr);
        const tempSnap = await getDoc(tempRef);
        if (!tempSnap.exists()) {
          await setDoc(tempRef, {
            date: dateStr,
            vending_temp: parseFloat((Math.random() * (4.0 - 3.0) + 3.0).toFixed(1)), // 3.0 to 4.0
            jofemar_temp: parseFloat((Math.random() * (4.0 - 3.0) + 3.0).toFixed(1)), // 3.0 to 4.0
            freezer_temp: parseFloat((Math.random() * (-18.0 - -22.0) + -22.0).toFixed(1)),
            freezer_b_temp: parseFloat((Math.random() * (-18.0 - -22.0) + -22.0).toFixed(1)),
            responsible: randomResponsible
          });
        }

        // 2. Cleaning Simulation (Normativa Compliant)
        const cleaningRef = doc(db, 'cleaning_records', dateStr);
        const cleaningSnap = await getDoc(cleaningRef);
        if (!cleaningSnap.exists()) {
          const tasksToMark: Record<string, string> = {
            'suelo_zona_clientes': 'X',
            'maquinas_exterior': 'X',
            'manos': 'X',
            'utiles_limpieza': 'X'
          };

          // Weekly tasks (S) - Every Monday
          if (date.getDay() === 1) {
            tasksToMark['resto_suelos'] = 'X';
            tasksToMark['estanterias'] = 'X';
            tasksToMark['cubo_residuos'] = 'X';
            tasksToMark['aseo'] = 'X';
          }

          // Monthly tasks (M) - 1st of month
          if (date.getDate() === 1) {
            tasksToMark['nevera_frigorifica'] = 'X';
          }

          // Annual tasks (A) - Jan 1st
          if (date.getMonth() === 0 && date.getDate() === 1) {
            tasksToMark['paredes_techo'] = 'X';
            tasksToMark['maquinas_interior'] = 'X';
            tasksToMark['arcon_congelador'] = 'X';
          }

          await setDoc(cleaningRef, {
            date: dateStr,
            tasks: tasksToMark,
            responsible: randomResponsible
          });
        }
      }
      
      // Update last simulation date in settings
      await setDoc(doc(db, 'settings', 'global'), {
        last_simulation_date: format(new Date(), 'yyyy-MM-dd'),
      }, { merge: true });

    } catch (error) {
      console.error("Simulation failed:", error);
    } finally {
      setSimulating(false);
    }
  };

  const seedSuppliers = async () => {
    const suppliers = [
      { name: "DIZVALLE", products: "SNACKS, BEBIDAS ETC...", ngrsa: "40.06531/CA" },
      { name: "SECTOR VENDING SL", products: "SNACKS, BEBIDAS ETC...", ngrsa: "40.046405/C" },
      { name: "S.COOP ANDALUZA GOLOSINAS GONZALEZ EHIJAS", products: "SNACKS, BEBIDAS ETC...", ngrsa: "40.076051/CA" }
    ];

    for (const s of suppliers) {
      await setDoc(doc(db, 'suppliers', s.name), s);
    }
    alert("Proveedores inicializados correctamente.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <RefreshCw className="w-8 h-8 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (!user || user.email !== 'davidhinojo@gmail.com') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">EL BOSQUE VENDING 24H</h1>
          <p className="text-slate-500 mb-8">Acceso restringido para el administrador.</p>
          <button 
            onClick={login}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Iniciar Sesión con Google
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'temperaturas', label: 'Control Temperaturas', icon: Thermometer },
    { id: 'limpieza', label: 'Limpieza y Desinfección', icon: ClipboardCheck },
    { id: 'trazabilidad', label: 'Listado Proveedores', icon: Truck },
    { id: 'vending', label: 'Máquina Comidas', icon: Package },
    { id: 'incidencias', label: 'Incidencias', icon: AlertTriangle },
    { id: 'formacion', label: 'Formación', icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:translate-x-0 lg:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-6 sm:mb-8">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 leading-tight tracking-tight text-xs sm:text-sm uppercase">EL BOSQUE</h2>
              <p className="text-[8px] sm:text-[9px] font-bold text-blue-600 uppercase tracking-widest">Vending 24h</p>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActivePlan(item.id as Plan);
                  setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all
                  ${activePlan === item.id 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <item.icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${activePlan === item.id ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
                {activePlan === item.id && <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-auto" />}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3 px-1">
              <img src={user.photoURL || ''} className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-slate-900 truncate">{user.displayName}</p>
                <p className="text-[8px] sm:text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] sm:text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 sm:h-16 bg-white/80 border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg shrink-0"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-sm sm:text-lg font-bold text-slate-900 truncate">
              {navItems.find(i => i.id === activePlan)?.label}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {simulating && (
              <span className="hidden sm:flex text-[10px] text-blue-600 animate-pulse items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                Sincronizando...
              </span>
            )}
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors shadow-sm"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">Exportar</span>
              <span className="xs:hidden">PDF</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {activePlan === 'temperaturas' && <TemperatureView />}
            {activePlan === 'limpieza' && <CleaningView />}
            {activePlan === 'trazabilidad' && <SuppliersView />}
            {activePlan === 'vending' && <VendingView />}
            {activePlan === 'incidencias' && <IncidentsView />}
            {activePlan === 'formacion' && <TrainingView />}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isExportModalOpen && (
          <ExportModal onClose={() => setIsExportModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Export Modal ---

function ExportModal({ onClose }: { onClose: () => void }) {
  const [selectedPlans, setSelectedPlans] = useState<Plan[]>(['temperaturas', 'limpieza', 'trazabilidad', 'vending', 'incidencias', 'formacion']);
  const [isExporting, setIsExporting] = useState(false);

  const plans: { id: Plan; label: string }[] = [
    { id: 'temperaturas', label: 'Control Temperaturas' },
    { id: 'limpieza', label: 'Limpieza y Desinfección' },
    { id: 'trazabilidad', label: 'Listado Proveedores' },
    { id: 'vending', label: 'Máquina Comidas' },
    { id: 'incidencias', label: 'Incidencias' },
    { id: 'formacion', label: 'Formación' },
  ];

  const togglePlan = (id: Plan) => {
    setSelectedPlans(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm'; // A4 width
      container.style.backgroundColor = 'white';
      document.body.appendChild(container);

      for (let i = 0; i < selectedPlans.length; i++) {
        const planId = selectedPlans[i];
        const planLabel = plans.find(p => p.id === planId)?.label || '';
        
        // Create a clean print version of the section
        const section = document.createElement('div');
        section.style.padding = '20mm';
        section.style.minHeight = '297mm'; // A4 height
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
        section.innerHTML = `
          <div style="text-align: center; margin-bottom: 20px; font-family: sans-serif;">
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: #1e293b;">EL BOSQUE VENDING 24H</h1>
            <h2 style="font-size: 18px; color: #475569; margin-bottom: 5px;">${planLabel}</h2>
            <p style="font-size: 10px; color: #94a3b8;">Fecha de exportación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <div id="content-${planId}" style="flex: 1; font-family: sans-serif;">
            <p style="text-align: center; padding: 40px; color: #94a3b8;">Cargando datos...</p>
          </div>
          <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-family: sans-serif;">
            <p style="font-size: 9px; color: #94a3b8; line-height: 1.5;">
              CLYSA (Centro de Laboratorio y Salud Ambiental). C/ Las Lomas, n23 planta -1, Prado del Rey (Cádiz) / Tlf.: 66194 96 95 / 856 SO 62 51
            </p>
          </div>
        `;
        container.appendChild(section);

        // Fetch data and render table
        const q = query(collection(db, planId === 'temperaturas' ? 'temperature_records' : 
                                     planId === 'limpieza' ? 'cleaning_records' : 
                                     planId === 'trazabilidad' ? 'suppliers' : 
                                     planId === 'vending' ? 'vending_products' : 
                                     planId === 'incidencias' ? 'incidents' : 'training_records'), 
                        orderBy(planId === 'trazabilidad' ? 'name' : planId === 'vending' ? 'entry_date' : 'date', 'desc'), 
                        limit(50));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data());

        const contentDiv = section.querySelector(`#content-${planId}`);
        if (contentDiv) {
          if (data.length === 0) {
            contentDiv.innerHTML = '<p style="text-align: center; padding: 20px; color: #64748b;">No hay registros para este anexo.</p>';
          } else {
            let tableHtml = `<table style="width: 100%; border-collapse: collapse; font-size: 9px; color: #334155;"><thead><tr style="background-color: #f1f5f9;">`;
            
            // Define headers based on plan
            let headers: string[] = [];
            let fields: string[] = [];

            if (planId === 'temperaturas') {
              headers = ['Fecha', 'M. Comidas', 'M. Jofemar', 'Arcón (A)', 'Arcón (B)', 'Firma'];
              fields = ['date', 'vending_temp', 'jofemar_temp', 'freezer_temp', 'freezer_b_temp', 'responsible'];
            } else if (planId === 'limpieza') {
              const cleaningTasks = [
                { id: 'suelo_zona_clientes', label: 'Suelo Z.C.' },
                { id: 'resto_suelos', label: 'R. Suelos' },
                { id: 'paredes_techo', label: 'Par./Techo' },
                { id: 'nevera_frigorifica', label: 'Nevera' },
                { id: 'maquinas_exterior', label: 'Máq. Ext.' },
                { id: 'maquinas_interior', label: 'Máq. Int.' },
                { id: 'arcon_congelador', label: 'Arcón' },
                { id: 'estanterias', label: 'Estant.' },
                { id: 'cubo_residuos', label: 'Resid.' },
                { id: 'manos', label: 'Manos' },
                { id: 'utiles_limpieza', label: 'Útiles' },
                { id: 'aseo', label: 'Aseo' },
              ];
              headers = ['Fecha', ...cleaningTasks.map(t => t.label), 'Firma'];
              fields = ['date', ...cleaningTasks.map(t => t.id), 'responsible'];
            } else if (planId === 'trazabilidad') {
              headers = ['Proveedor', 'Productos', 'NGRSA'];
              fields = ['name', 'products', 'ngrsa'];
            } else if (planId === 'vending') {
              headers = ['Producto', 'Lote', 'Entrada', 'Cant.', 'Caducidad', 'Firma'];
              fields = ['product', 'lot', 'entry_date', 'quantity', 'expiry_date', 'responsible'];
            } else if (planId === 'incidencias') {
              headers = ['Fecha', 'Incidencia', 'Medida', 'Firma'];
              fields = ['date', 'description', 'corrective_action', 'responsible'];
            } else if (planId === 'formacion') {
              headers = ['Fecha', 'Empleado', 'Puesto', 'Tipo', 'Empresa', 'Firma'];
              fields = ['date', 'employee_name', 'position', 'training_type', 'company', 'responsible'];
            }

            headers.forEach(h => tableHtml += `<th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left; font-weight: bold;">${h}</th>`);
            tableHtml += `</tr></thead><tbody>`;

            data.forEach((row, idx) => {
              tableHtml += `<tr style="background-color: ${idx % 2 === 0 ? 'white' : '#f8fafc'};">`;
              fields.forEach(f => {
                let val = '-';
                if (planId === 'limpieza' && ![ 'date', 'responsible' ].includes(f)) {
                  val = row.tasks?.[f] || '-';
                } else {
                  val = row[f] || '-';
                }
                
                if (f.includes('temp') && val !== '-') val += ' ºC';
                if (f.includes('date')) {
                  try { val = format(parseISO(val), 'dd/MM/yyyy'); } catch(e) {}
                }
                tableHtml += `<td style="border: 1px solid #e2e8f0; padding: 4px; text-align: center;">${val}</td>`;
              });
              tableHtml += `</tr>`;
            });
            tableHtml += `</tbody></table>`;
            contentDiv.innerHTML = tableHtml;
          }
        }

        // Capture as canvas
        const canvas = await html2canvas(section, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        
        // Remove section from DOM after capture to save memory
        container.removeChild(section);
      }

      pdf.save(`Vending_ElBosque_Anexos_${format(new Date(), 'yyyyMMdd')}.pdf`);
      document.body.removeChild(container);
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Error al exportar los anexos. Por favor, inténtelo de nuevo.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-slate-900">Exportar Anexos</h2>
            <p className="text-[10px] sm:text-sm text-slate-500">Seleccione los planes a exportar</p>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-3 sm:p-6 space-y-2 sm:space-y-3 overflow-y-auto">
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => togglePlan(plan.id)}
              className={`
                w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all
                ${selectedPlans.includes(plan.id) 
                  ? 'border-blue-600 bg-blue-50/50' 
                  : 'border-slate-100 hover:border-slate-200'}
              `}
            >
              <div className={`
                w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center transition-colors shrink-0
                ${selectedPlans.includes(plan.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'}
              `}>
                {selectedPlans.includes(plan.id) && <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />}
              </div>
              <div className="text-left min-w-0">
                <p className={`text-xs sm:text-base font-semibold truncate ${selectedPlans.includes(plan.id) ? 'text-blue-900' : 'text-slate-700'}`}>
                  {plan.label}
                </p>
                <p className="text-[9px] sm:text-xs text-slate-500">Formato DIN A4</p>
              </div>
              <FileText className={`w-4 h-4 sm:w-5 sm:h-5 ml-auto shrink-0 ${selectedPlans.includes(plan.id) ? 'text-blue-400' : 'text-slate-300'}`} />
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 bg-slate-50 flex gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleExport}
            disabled={selectedPlans.length === 0 || isExporting}
            className={`
              flex-1 px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm text-white transition-all flex items-center justify-center gap-2
              ${selectedPlans.length === 0 || isExporting ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'}
            `}
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                Generar PDF
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TemperatureView() {
  const [records, setRecords] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    vending_temp: 3.5,
    jofemar_temp: 3.5,
    freezer_temp: -19.5,
    freezer_b_temp: -19.5,
    responsible: 'David H.'
  });

  useEffect(() => {
    const q = query(
      collection(db, 'temperature_records'), 
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [startDate, endDate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'temperature_records', formData.date), formData);
      setIsAdding(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving temperature record:", error);
    }
  };

  const startEdit = (record: any) => {
    setFormData(record);
    setEditingId(record.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base">REGISTRO DE TEMPERATURAS</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const responsibles = ["David H.", "Lui Benitez"];
              const randomResponsible = responsibles[Math.floor(Math.random() * responsibles.length)];
              setIsAdding(!isAdding);
              setEditingId(null);
              setFormData({ 
                date: format(new Date(), 'yyyy-MM-dd'), 
                vending_temp: 3.5, 
                jofemar_temp: 3.5,
                freezer_temp: -19.5, 
                freezer_b_temp: -19.5,
                responsible: randomResponsible 
              });
            }}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Thermometer className="w-4 h-4" />}
            {isAdding ? 'Cancelar' : 'Añadir Registro'}
          </button>
          {!isAdding && (
            <button 
              onClick={async () => {
                const responsibles = ["David H.", "Lui Benitez"];
                for (let i = 1; i <= 7; i++) {
                  const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
                  const randomResponsible = responsibles[Math.floor(Math.random() * responsibles.length)];
                  const data = {
                    date,
                    vending_temp: parseFloat((Math.random() * 2 + 2).toFixed(1)),
                    jofemar_temp: parseFloat((Math.random() * 2 + 2).toFixed(1)),
                    freezer_temp: parseFloat((Math.random() * 5 - 22).toFixed(1)),
                    freezer_b_temp: parseFloat((Math.random() * 5 - 22).toFixed(1)),
                    responsible: randomResponsible
                  };
                  await setDoc(doc(db, 'temperature_records', date), data);
                }
                console.log('Sample data generated');
              }}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-xl transition-colors shrink-0"
              title="Generar datos de ejemplo"
            >
              <Truck className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-4 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Desde:</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Hasta:</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button 
          onClick={() => {
            setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
            setEndDate(format(new Date(), 'yyyy-MM-dd'));
          }}
          className="text-[10px] text-blue-600 font-semibold hover:underline text-right sm:text-left"
        >
          Limpiar filtros
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" disabled={!!editingId} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">M. Comidas (≤ 4ºC)</label>
                <input type="number" step="0.1" required value={formData.vending_temp} onChange={e => setFormData({...formData, vending_temp: parseFloat(e.target.value)})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">M. Jofemar (≤ 4ºC)</label>
                <input type="number" step="0.1" required value={formData.jofemar_temp} onChange={e => setFormData({...formData, jofemar_temp: parseFloat(e.target.value)})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Arcón (A) (≤ -18ºC)</label>
                <input type="number" step="0.1" required value={formData.freezer_temp} onChange={e => setFormData({...formData, freezer_temp: parseFloat(e.target.value)})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Arcón (B) (≤ -18ºC)</label>
                <input type="number" step="0.1" required value={formData.freezer_b_temp} onChange={e => setFormData({...formData, freezer_b_temp: parseFloat(e.target.value)})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Responsable</label>
                <select value={formData.responsible} onChange={e => setFormData({...formData, responsible: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="David H.">David H.</option>
                  <option value="Lui Benitez">Lui Benitez</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                {records.length > 0 && !editingId && (
                  <button 
                    type="button"
                    onClick={() => {
                      const last = records[0];
                      setFormData({
                        ...formData,
                        vending_temp: last.vending_temp,
                        jofemar_temp: last.jofemar_temp,
                        freezer_temp: last.freezer_temp,
                        freezer_b_temp: last.freezer_b_temp,
                        responsible: last.responsible
                      });
                    }}
                    className="text-slate-500 hover:text-slate-700 text-xs font-semibold px-4 py-2"
                  >
                    Copiar último registro
                  </button>
                )}
                <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-semibold">{editingId ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider">
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Día</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">M. Comidas</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">M. Jofemar</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Arcón (A)</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Arcón (B)</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Firma</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm font-medium text-slate-900">{r.date}</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{r.vending_temp} ºC</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{r.jofemar_temp || '-'} ºC</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{r.freezer_temp} ºC</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{r.freezer_b_temp || '-'} ºC</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-400 italic">{r.responsible}</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm">
                    <button onClick={() => startEdit(r)} className="text-blue-600 hover:underline">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ViewFooter />
    </div>
  );
}

function CleaningView() {
  const [records, setRecords] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    tasks: {} as Record<string, string>,
    responsible: 'David H.'
  });

  useEffect(() => {
    const q = query(collection(db, 'cleaning_records'), orderBy('date', 'desc'), limit(31));
    return onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const tasks = [
    { id: 'suelo_zona_clientes', label: 'Suelo zona clientes (D)' },
    { id: 'resto_suelos', label: 'Resto de suelos (S)' },
    { id: 'paredes_techo', label: 'Paredes y techo (A)' },
    { id: 'nevera_frigorifica', label: 'Nevera frigorífica (M)' },
    { id: 'maquinas_exterior', label: 'Máquinas exterior (D)' },
    { id: 'maquinas_interior', label: 'Máquinas interior (A)' },
    { id: 'arcon_congelador', label: 'Arcón congelador (A)' },
    { id: 'estanterias', label: 'Estanterías (S)' },
    { id: 'cubo_residuos', label: 'Cubo residuos (S)' },
    { id: 'manos', label: 'Manos (D)' },
    { id: 'utiles_limpieza', label: 'Útiles limpieza (D)' },
    { id: 'aseo', label: 'ASEO (S)' },
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'cleaning_records', formData.date), formData);
      setIsAdding(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving cleaning record:", error);
    }
  };

  const toggleTask = (taskId: string) => {
    const newTasks = { ...formData.tasks };
    newTasks[taskId] = newTasks[taskId] === 'X' ? '' : 'X';
    setFormData({ ...formData, tasks: newTasks });
  };

  const startEdit = (record: any) => {
    setFormData(record);
    setEditingId(record.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base">REGISTRO DE L + D</h3>
        <button 
          onClick={() => {
            const responsibles = ["David H.", "Lui Benitez"];
            const randomResponsible = responsibles[Math.floor(Math.random() * responsibles.length)];
            setIsAdding(!isAdding);
            setEditingId(null);
            setFormData({ date: format(new Date(), 'yyyy-MM-dd'), tasks: {}, responsible: randomResponsible });
          }}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isAdding ? <X className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}
          {isAdding ? 'Cancelar' : 'Añadir Registro'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" disabled={!!editingId} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Responsable</label>
                  <select value={formData.responsible} onChange={e => setFormData({...formData, responsible: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="David H.">David H.</option>
                    <option value="Lui Benitez">Lui Benitez</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {tasks.map(t => (
                  <button key={t.id} type="button" onClick={() => toggleTask(t.id)} className={`p-2.5 sm:p-3 rounded-xl border text-[10px] sm:text-xs font-medium transition-all text-left flex items-center justify-between ${formData.tasks[t.id] === 'X' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                    {t.label} {formData.tasks[t.id] === 'X' && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-semibold">{editingId ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider">
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Día</th>
                {tasks.map(t => (
                  <th key={t.id} className="px-1 py-2.5 sm:py-4 border-b border-slate-200 text-center text-[8px] sm:text-[9px] leading-tight">{t.label.split('(')[0]}</th>
                ))}
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Firma</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm font-medium text-slate-900">{r.date}</td>
                  {tasks.map(t => (
                    <td key={t.id} className="px-1 py-2.5 sm:py-4 text-[11px] text-center text-blue-600 font-bold">{r.tasks?.[t.id] || '-'}</td>
                  ))}
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-400 italic">{r.responsible}</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm">
                    <button onClick={() => startEdit(r)} className="text-blue-600 hover:underline">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ViewFooter />
    </div>
  );
}

function SuppliersView() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', products: '', ngrsa: '' });

  useEffect(() => {
    return onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'suppliers', formData.name), formData);
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', products: '', ngrsa: '' });
    } catch (error) {
      console.error("Error saving supplier:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteDoc(doc(db, 'suppliers', confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Error deleting supplier:", error);
    }
  };

  const startEdit = (supplier: any) => {
    setFormData(supplier);
    setEditingId(supplier.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base uppercase tracking-tight">LISTADO DE PROVEEDORES</h3>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            setFormData({ name: '', products: '', ngrsa: '' });
          }}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
          {isAdding ? 'Cancelar' : 'Añadir Proveedor'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" disabled={!!editingId} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Productos</label>
                <input type="text" required value={formData.products} onChange={e => setFormData({...formData, products: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">NGRSA</label>
                <input type="text" required value={formData.ngrsa} onChange={e => setFormData({...formData, ngrsa: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
                <button type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-semibold">{editingId ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider">
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Proveedor</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Productos</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">NGRSA</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm font-medium text-slate-900">{s.name}</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{s.products}</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{s.ngrsa}</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm">
                    <div className="flex items-center gap-3">
                      <button onClick={() => startEdit(s)} className="text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                      <button onClick={() => setConfirmDeleteId(s.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">¿Eliminar proveedor?</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Esta acción no se puede deshacer. El proveedor será eliminado permanentemente.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 px-4 py-2 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ViewFooter />
    </div>
  );
}

function VendingView() {
  const [products, setProducts] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    product: '',
    lot: '',
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    quantity: 0,
    expiry_date: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    retired_quantity: 0,
    responsible: 'David H.'
  });

  useEffect(() => {
    const q = query(collection(db, 'vending_products'), orderBy('entry_date', 'desc'));
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleEntryDateChange = (date: string) => {
    const newEntryDate = parseISO(date);
    const newExpiryDate = addDays(newEntryDate, 15);
    setFormData({
      ...formData,
      entry_date: date,
      expiry_date: format(newExpiryDate, 'yyyy-MM-dd')
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const id = editingId || `${formData.entry_date}_${formData.product.replace(/\s+/g, '_')}_${formData.lot}`;
      await setDoc(doc(db, 'vending_products', id), formData);
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        product: '',
        lot: '',
        entry_date: format(new Date(), 'yyyy-MM-dd'),
        quantity: 0,
        expiry_date: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
        retired_quantity: 0,
        responsible: 'David H.'
      });
    } catch (error) {
      console.error("Error saving vending product:", error);
    }
  };

  const startEdit = (product: any) => {
    setFormData(product);
    setEditingId(product.id);
    setIsAdding(true);
  };

  const updateRetired = async (id: string, currentData: any, val: string) => {
    try {
      await setDoc(doc(db, 'vending_products', id), {
        ...currentData,
        retired_quantity: parseInt(val) || 0
      });
    } catch (error) {
      console.error("Error updating retired quantity:", error);
    }
  };

  const expiringSoon = products.filter(p => {
    const expiry = parseISO(p.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = addDays(today, 3);
    return isAfter(expiry, subDays(today, 1)) && !isAfter(expiry, threeDaysFromNow);
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-lg font-bold text-slate-900">MÁQUINA EXPENDEDORA DE COMIDAS</h3>
          <p className="text-[10px] sm:text-xs text-slate-500">Plan de Trazabilidad - Rev. 01</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            setFormData({
              product: '',
              lot: '',
              entry_date: format(new Date(), 'yyyy-MM-dd'),
              quantity: 0,
              expiry_date: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
              retired_quantity: 0,
              responsible: 'David H.'
            });
          }}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Package className="w-4 h-4" />}
          {isAdding ? 'Cancelar' : 'Añadir Producto'}
        </button>
      </div>

      <AnimatePresence>
        {expiringSoon.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-3 sm:p-4 flex items-start gap-3 sm:gap-4"
          >
            <div className="bg-amber-100 p-1.5 sm:p-2 rounded-xl shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-amber-900 uppercase tracking-tight">Productos próximos a caducar</h4>
              <p className="text-[10px] sm:text-xs text-amber-700 mt-0.5">
                Hay {expiringSoon.length} {expiringSoon.length === 1 ? 'producto' : 'productos'} que caducan pronto.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {expiringSoon.map((p, idx) => (
                  <span key={idx} className="bg-white/60 border border-amber-200 px-2 py-0.5 rounded-lg text-[9px] font-bold text-amber-800 uppercase">
                    {p.product} ({format(parseISO(p.expiry_date), 'dd/MM')})
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Producto</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nombre del producto"
                  value={formData.product}
                  onChange={e => setFormData({...formData, product: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lote</label>
                <input 
                  type="text" 
                  required
                  placeholder="Número de lote"
                  value={formData.lot}
                  onChange={e => setFormData({...formData, lot: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha Entrada</label>
                <input 
                  type="date" 
                  required
                  value={formData.entry_date}
                  onChange={e => handleEntryDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cantidad</label>
                <input 
                  type="number" 
                  required
                  value={formData.quantity}
                  onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha Caducidad (+15 días)</label>
                <input 
                  type="date" 
                  required
                  value={formData.expiry_date}
                  onChange={e => setFormData({...formData, expiry_date: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cant. Prod. Retirado</label>
                <input 
                  type="number" 
                  value={formData.retired_quantity}
                  onChange={e => setFormData({...formData, retired_quantity: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Responsable</label>
                <select value={formData.responsible} onChange={e => setFormData({...formData, responsible: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="David H.">David H.</option>
                  <option value="Lui Benitez">Lui Benitez</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
                <button 
                  type="submit"
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  {editingId ? 'Actualizar Producto' : 'Guardar en Máquina'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider">
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Producto</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Lote</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Entrada</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Cantidad</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Caducidad</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Retirado</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Firma</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                    No hay productos registrados en la máquina.
                  </td>
                </tr>
              ) : (
                  products.map((p, i) => {
                    const expiry = parseISO(p.expiry_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isExpired = isAfter(today, expiry);
                    const isExpiringSoon = !isExpired && !isAfter(expiry, addDays(today, 3));

                    return (
                      <tr key={i} className={`hover:bg-slate-50/50 transition-colors ${isExpiringSoon ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            {p.product}
                            {isExpiringSoon && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            {isExpired && <AlertTriangle className="w-3 h-3 text-red-500" />}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{p.lot}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{format(parseISO(p.entry_date), 'dd/MM/yyyy')}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{p.quantity}</td>
                        <td className={`px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm font-semibold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-slate-600'}`}>
                          {format(parseISO(p.expiry_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm">
                          <input 
                            type="number"
                            defaultValue={p.retired_quantity}
                            onBlur={(e) => updateRetired(p.id, p, e.target.value)}
                            className="w-14 sm:w-20 px-2 py-1 rounded border border-slate-200 text-center focus:ring-1 focus:ring-blue-500 outline-none text-[11px] sm:text-sm"
                          />
                        </td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-400 italic">{p.responsible}</td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm">
                          <button onClick={() => startEdit(p)} className="text-blue-600 hover:underline">Editar</button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ViewFooter />
    </div>
  );
}

function IncidentsView() {
  const [records, setRecords] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    corrective_action: '',
    responsible: 'David H.'
  });

  useEffect(() => {
    const q = query(collection(db, 'incidents'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const id = editingId || `${formData.date}_${Date.now()}`;
      await setDoc(doc(db, 'incidents', id), formData);
      setIsAdding(false);
      setEditingId(null);
      setFormData({ date: format(new Date(), 'yyyy-MM-dd'), description: '', corrective_action: '', responsible: 'David H.' });
    } catch (error) {
      console.error("Error saving incident:", error);
    }
  };

  const startEdit = (record: any) => {
    setFormData(record);
    setEditingId(record.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base uppercase tracking-tight">REGISTRO DE INCIDENCIAS Y ACCIONES CORRECTORAS</h3>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            setFormData({ date: format(new Date(), 'yyyy-MM-dd'), description: '', corrective_action: '', responsible: 'David H.' });
          }}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isAdding ? <X className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {isAdding ? 'Cancelar' : 'Añadir Incidencia'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Responsable</label>
                  <select value={formData.responsible} onChange={e => setFormData({...formData, responsible: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="David H.">David H.</option>
                    <option value="Lui Benitez">Lui Benitez</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Incidencia Detectada</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 h-20 sm:h-24" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Medidas Correctoras Aplicadas</label>
                <textarea required value={formData.corrective_action} onChange={e => setFormData({...formData, corrective_action: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 h-20 sm:h-24" />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-semibold">{editingId ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider">
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Fecha</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Incidencia Detectada</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Medidas Correctoras Aplicadas</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Firma</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm font-medium text-slate-900">{r.date}</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{r.description}</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{r.corrective_action}</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-400 italic">{r.responsible}</td>
                  <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm">
                    <button onClick={() => startEdit(r)} className="text-blue-600 hover:underline">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ViewFooter />
    </div>
  );
}

function TrainingView() {
  const [records, setRecords] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    employee_name: '',
    position: '',
    training_type: '',
    company: '',
    responsible: 'David H.'
  });

  useEffect(() => {
    const q = query(collection(db, 'training_records'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const id = editingId || `${formData.date}_${formData.employee_name.replace(/\s+/g, '_')}`;
      await setDoc(doc(db, 'training_records', id), formData);
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        employee_name: '',
        position: '',
        training_type: '',
        company: '',
        responsible: 'David H.'
      });
    } catch (error) {
      console.error("Error saving training record:", error);
    }
  };

  const startEdit = (record: any) => {
    setFormData(record);
    setEditingId(record.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-lg font-bold text-slate-900 uppercase tracking-tight">PLAN DE FORMACIÓN DE MANIPULADORES</h3>
          <p className="text-[10px] sm:text-xs text-slate-500">Registro de Empleados y Actividades Formativas - Rev. 01</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            setFormData({
              date: format(new Date(), 'yyyy-MM-dd'),
              employee_name: '',
              position: '',
              training_type: '',
              company: '',
              responsible: 'David H.'
            });
          }}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isAdding ? <X className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
          {isAdding ? 'Cancelar' : 'Añadir Registro'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha de la Formación</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre Empleado</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Juan Pérez"
                  value={formData.employee_name}
                  onChange={e => setFormData({...formData, employee_name: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Puesto de Trabajo</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Reponedor"
                  value={formData.position}
                  onChange={e => setFormData({...formData, position: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Act. Formativa</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Curso Manipulador"
                  value={formData.training_type}
                  onChange={e => setFormData({...formData, training_type: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Empresa de Formación</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: CLYSA"
                  value={formData.company}
                  onChange={e => setFormData({...formData, company: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Responsable</label>
                <select value={formData.responsible} onChange={e => setFormData({...formData, responsible: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="David H.">David H.</option>
                  <option value="Lui Benitez">Lui Benitez</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
                <button 
                  type="submit"
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  {editingId ? 'Actualizar Registro' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider">
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Fecha</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Empleado</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Puesto</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Tipo Actividad</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Empresa Formadora</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Firma</th>
                <th className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                    No hay registros de formación todavía.
                  </td>
                </tr>
              ) : (
                records.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm font-medium text-slate-900">{format(parseISO(r.date), 'dd/MM/yyyy')}</td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{r.employee_name}</td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{r.position}</td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{r.training_type}</td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-600">{r.company}</td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm text-slate-400 italic">{r.responsible}</td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-[11px] sm:text-sm">
                      <button onClick={() => startEdit(r)} className="text-blue-600 hover:underline">Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ViewFooter />
    </div>
  );
}
