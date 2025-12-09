import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, ProjectTask, BusinessPartner, TaskComment } from '../businessTypes';
import { 
  LayoutDashboard, List, Calendar as CalendarIcon, 
  Plus, CheckCircle2, Clock, AlertCircle, 
  ChevronDown, ChevronRight, MessageSquare, 
  User as UserIcon, CalendarDays, X, Send, Trash2, Filter,
  ZoomIn, ZoomOut, GripVertical, MoreHorizontal, ArrowLeft, ArrowRight
} from 'lucide-react';
import { generateUUID, parseDate } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BusinessProjectsProps {
  projects: Project[];
  tasks: ProjectTask[];
  partners: BusinessPartner[];
  currentUser: { name: string; id: string; email?: string };
  onAddTask: (task: Omit<ProjectTask, 'id'>) => void;
  onUpdateTask: (id: string, task: Partial<ProjectTask>) => void;
  onDeleteTask: (id: string) => void;
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    todo: 'bg-slate-100 text-slate-600 border-slate-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    review: 'bg-purple-100 text-purple-700 border-purple-200',
    done: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  };
  const labels = {
    todo: 'A Fazer',
    in_progress: 'Em Andamento',
    review: 'Revisão',
    done: 'Concluído'
  };
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
};

export const BusinessProjects: React.FC<BusinessProjectsProps> = ({
  projects,
  tasks,
  partners,
  currentUser,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'list' | 'gantt' | 'calendar'>('dashboard');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Gantt State
  const [ganttScope, setGanttScope] = useState<'month' | 'quarter'>('month');
  const [ganttBaseDate, setGanttBaseDate] = useState(new Date()); // Data base para navegação
  const ganttContainerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<ProjectTask>>({
    title: '', description: '', projectId: '', responsibleId: '', 
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    status: 'todo', priority: 'medium'
  });
  const [newComment, setNewComment] = useState('');

  const activeProjects = useMemo(() => projects.filter(p => p.status === 'active'), [projects]);
  const activeProjectIds = useMemo(() => activeProjects.map(p => p.id), [activeProjects]);
  
  const filteredTasks = useMemo(() => {
    let t = tasks.filter(t => activeProjectIds.includes(t.projectId));
    if (filterMyTasks) {
        const myPartnerProfile = partners.find(p => p.email === currentUser.email);
        const targetId = myPartnerProfile ? myPartnerProfile.id : currentUser.id;
        t = t.filter(task => task.responsibleId === targetId);
    }
    return t;
  }, [tasks, activeProjectIds, filterMyTasks, currentUser.id, currentUser.email, partners]);

  // --- HELPERS ---
  const toggleProject = (id: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedProjects(newSet);
  };

  const handleOpenNewTask = (preselectedProjectId?: string) => {
    setEditingTask(null);
    setFormData({
      title: '', description: '', 
      projectId: preselectedProjectId || activeProjects[0]?.id || '', 
      responsibleId: partners[0]?.id || '', 
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'todo', priority: 'medium'
    });
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: ProjectTask) => {
    setEditingTask(task);
    setFormData(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.projectId || !formData.responsibleId) return alert('Preencha os campos obrigatórios.');

    const project = projects.find(p => p.id === formData.projectId);
    const responsible = partners.find(p => p.id === formData.responsibleId);

    const taskData: any = {
      ...formData,
      projectName: project?.name,
      responsibleName: responsible?.name || 'Não atribuído'
    };

    if (editingTask) {
      onUpdateTask(editingTask.id, taskData);
    } else {
      onAddTask({ ...taskData, id: generateUUID(), comments: [] });
    }
    setIsTaskModalOpen(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !editingTask) return;
    const comment: TaskComment = {
      id: generateUUID(),
      userId: currentUser.id, 
      userName: currentUser.name || 'Usuário',
      text: newComment,
      createdAt: new Date().toISOString()
    };
    const updatedComments = [...(editingTask.comments || []), comment];
    onUpdateTask(editingTask.id, { comments: updatedComments });
    setEditingTask({ ...editingTask, comments: updatedComments });
    setNewComment('');
  };

  const kpis = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const delayed = filteredTasks.filter(t => t.status !== 'done' && t.dueDate < today).length;
    const pending = filteredTasks.filter(t => t.status !== 'done' && t.dueDate >= today).length;
    const done = filteredTasks.filter(t => t.status === 'done').length;
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
    const weekTasks = filteredTasks.filter(t => t.status !== 'done' && t.dueDate >= today && t.dueDate <= nextWeek.toISOString().split('T')[0]).length;
    
    const byUser = partners.map(p => ({
      name: p.name, count: filteredTasks.filter(t => t.responsibleId === p.id && t.status !== 'done').length
    })).sort((a,b) => b.count - a.count);

    const statusDistribution = [
      { name: 'A Fazer', value: filteredTasks.filter(t => t.status === 'todo').length, color: '#94a3b8' },
      { name: 'Em Andamento', value: filteredTasks.filter(t => t.status === 'in_progress').length, color: '#3b82f6' },
      { name: 'Revisão', value: filteredTasks.filter(t => t.status === 'review').length, color: '#a855f7' },
      { name: 'Concluído', value: filteredTasks.filter(t => t.status === 'done').length, color: '#10b981' }
    ];

    return { delayed, pending, done, weekTasks, byUser, statusDistribution };
  }, [filteredTasks, partners]);

  const renderResponsible = (userId: string, userName: string) => {
      const partner = partners.find(p => p.id === userId);
      return (
          <div className="flex flex-col">
              <span className="flex items-center gap-1"><UserIcon size={12}/> {userName}</span>
              {partner?.email && (
                  <span className="text-[10px] text-slate-400 ml-4">{partner.email}</span>
              )}
          </div>
      );
  };

  const getInitials = (name: string) => {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // --- RENDERIZADORES DE VISUALIZAÇÃO ---

  const renderCalendar = () => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = new Date(today.getFullYear(), today.getMonth(), 1).getDay(); 
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full animate-fadeIn">
            <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-500 uppercase">Calendário Mensal</h3>
                <span className="text-xs font-bold text-slate-400">{today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="bg-slate-50 dark:bg-slate-800 p-2 text-center text-xs font-bold text-slate-500 uppercase">{d}</div>
                    ))}
                    {blanks.map(b => <div key={`blank-${b}`} className="bg-white dark:bg-slate-900 min-h-[100px]"></div>)}
                    {days.map(day => {
                        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayTasks = filteredTasks.filter(t => t.dueDate === dateStr);
                        const isToday = day === today.getDate();

                        return (
                            <div key={day} className={`bg-white dark:bg-slate-900 min-h-[100px] p-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1 ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                <span className={`text-xs font-bold mb-1 ${isToday ? 'text-indigo-600 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center' : 'text-slate-400'}`}>{day}</span>
                                {dayTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        onClick={() => handleEditTask(task)}
                                        className={`text-[10px] p-1.5 rounded cursor-pointer truncate flex items-center gap-1 ${task.status === 'done' ? 'bg-emerald-100 text-emerald-700 line-through opacity-70' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                        title={task.title}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                                        {task.title}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
  };

  // --- GANTT CHART AVANÇADO ---
  const renderGantt = () => {
    // Definição de Escala (Zoom)
    const zoomLevel = ganttScope === 'month' ? 40 : 20; // 40px por dia (Mês) ou 20px (Trimestre)
    
    // Cálculo do Período de Visualização
    const startDateView = new Date(ganttBaseDate.getFullYear(), ganttBaseDate.getMonth(), 1);
    let endDateView = new Date(ganttBaseDate.getFullYear(), ganttBaseDate.getMonth() + 1, 0); // Padrão Mês

    if (ganttScope === 'quarter') {
        // Ajusta para o trimestre
        startDateView.setMonth(Math.floor(startDateView.getMonth() / 3) * 3);
        endDateView = new Date(startDateView.getFullYear(), startDateView.getMonth() + 3, 0);
    }
    
    // Adiciona margem de dias antes e depois para scroll suave
    startDateView.setDate(startDateView.getDate() - 5);
    endDateView.setDate(endDateView.getDate() + 5);

    const totalDays = Math.ceil((endDateView.getTime() - startDateView.getTime()) / (1000 * 3600 * 24));
    const daysArray = Array.from({ length: totalDays }, (_, i) => {
        const d = new Date(startDateView);
        d.setDate(d.getDate() + i);
        return d;
    });

    const getXPosition = (dateStr: string) => {
        const date = new Date(dateStr);
        const diffDays = Math.ceil((date.getTime() - startDateView.getTime()) / (1000 * 3600 * 24));
        return diffDays * zoomLevel;
    };

    const handleTaskDragStart = (e: React.DragEvent, task: ProjectTask, type: 'move' | 'resize-left' | 'resize-right') => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.setData('type', type);
        e.dataTransfer.setData('startX', e.clientX.toString());
        e.dataTransfer.setData('originalStart', task.startDate);
        e.dataTransfer.setData('originalEnd', task.dueDate);
        
        // Ghost Image customizada (opcional, aqui usamos padrão)
        // e.dataTransfer.setDragImage(img, 0, 0);
    };

    const handleGanttDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const type = e.dataTransfer.getData('type');
        const startX = parseFloat(e.dataTransfer.getData('startX'));
        const originalStart = new Date(e.dataTransfer.getData('originalStart'));
        const originalEnd = new Date(e.dataTransfer.getData('originalEnd'));
        
        const deltaPixels = e.clientX - startX;
        const deltaDays = Math.round(deltaPixels / zoomLevel);

        if (deltaDays === 0) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        let newStart = new Date(originalStart);
        let newEnd = new Date(originalEnd);

        if (type === 'move') {
            newStart.setDate(newStart.getDate() + deltaDays);
            newEnd.setDate(newEnd.getDate() + deltaDays);
        } else if (type === 'resize-right') {
            newEnd.setDate(newEnd.getDate() + deltaDays);
            if (newEnd < newStart) newEnd = newStart;
        } else if (type === 'resize-left') {
            newStart.setDate(newStart.getDate() + deltaDays);
            if (newStart > newEnd) newStart = newEnd;
        }

        onUpdateTask(taskId, {
            startDate: newStart.toISOString().split('T')[0],
            dueDate: newEnd.toISOString().split('T')[0]
        });
    };

    // Navegação
    const navigateGantt = (direction: 'prev' | 'next') => {
        const newDate = new Date(ganttBaseDate);
        if (ganttScope === 'month') {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 3 : -3));
        }
        setGanttBaseDate(newDate);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full animate-fadeIn">
            {/* Toolbar */}
            <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-sm text-slate-500 uppercase">Cronograma (Gantt)</h3>
                    
                    {/* Seletor de Período (Scope) */}
                    <div className="flex items-center bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-1">
                        <button 
                            onClick={() => setGanttScope('month')} 
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${ganttScope === 'month' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            Mensal
                        </button>
                        <button 
                            onClick={() => setGanttScope('quarter')} 
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${ganttScope === 'quarter' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            Trimestral
                        </button>
                    </div>

                    {/* Navegação de Data */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigateGantt('prev')} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><ArrowLeft size={16} className="text-slate-500"/></button>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-32 text-center">
                            {ganttBaseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => navigateGantt('next')} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><ArrowRight size={16} className="text-slate-500"/></button>
                    </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Normal</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Concluído</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Alta</span>
                </div>
            </div>
            
            {/* Scrollable Area */}
            <div 
                className="flex-1 overflow-auto relative custom-scrollbar" 
                ref={ganttContainerRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleGanttDrop}
            >
                <div style={{ width: `${totalDays * zoomLevel + 250}px` }}> {/* 250px for sidebar width */}
                    
                    {/* Timeline Header */}
                    <div className="flex border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-20 h-10">
                        <div className="w-60 p-3 border-r border-slate-100 dark:border-slate-700 font-bold text-xs text-slate-500 shrink-0 sticky left-0 bg-white dark:bg-slate-800 z-30 shadow-sm">
                            Atividade / Projeto
                        </div>
                        <div className="flex-1 relative">
                            {daysArray.map((d, i) => {
                                const isFirstDay = d.getDate() === 1;
                                const isToday = d.toDateString() === new Date().toDateString();
                                return (
                                    <div 
                                        key={i} 
                                        className={`absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-800/50 flex flex-col justify-center items-center text-[10px] ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/20 font-bold text-indigo-600' : 'text-slate-400'}`}
                                        style={{ left: i * zoomLevel, width: zoomLevel }}
                                    >
                                        {isFirstDay && <span className="absolute -top-4 left-1 font-bold text-indigo-400 text-xs whitespace-nowrap">{d.toLocaleDateString('pt-BR', { month: 'long' })}</span>}
                                        <span>{d.getDate()}</span>
                                        {zoomLevel > 30 && <span className="text-[8px] opacity-60">{['D','S','T','Q','Q','S','S'][d.getDay()]}</span>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Gantt Body */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {activeProjects.map(project => {
                            const pTasks = filteredTasks.filter(t => t.projectId === project.id);
                            if (pTasks.length === 0) return null;

                            return (
                                <React.Fragment key={project.id}>
                                    {/* Project Header Row */}
                                    <div className="bg-slate-50/80 dark:bg-slate-900/50 h-8 flex items-center sticky left-0 z-10 w-full">
                                        <div className="w-60 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900 z-20 truncate border-r border-slate-200 dark:border-slate-700 h-full flex items-center">
                                            {project.name}
                                        </div>
                                    </div>

                                    {/* Task Rows */}
                                    {pTasks.map(task => {
                                        const startX = getXPosition(task.startDate);
                                        const endX = getXPosition(task.dueDate) + zoomLevel; 
                                        const width = Math.max(zoomLevel, endX - startX);
                                        const partnerInitials = getInitials(task.responsibleName);

                                        return (
                                            <div key={task.id} className="h-14 relative flex items-center group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <div className="w-60 px-4 border-r border-slate-100 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 truncate shrink-0 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 z-20 h-full flex items-center cursor-pointer hover:text-indigo-600 gap-2" onClick={() => handleEditTask(task)}>
                                                    <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                    <span className="truncate">{task.title}</span>
                                                </div>
                                                
                                                {/* Grid Lines Background */}
                                                <div className="absolute inset-0 left-60 flex pointer-events-none">
                                                    {daysArray.map((_, i) => (
                                                        <div key={i} className="border-r border-slate-50 dark:border-slate-800/30 h-full" style={{ width: zoomLevel, minWidth: zoomLevel }}></div>
                                                    ))}
                                                </div>

                                                {/* Task Bar (DOBRADO DE h-6 PARA h-10) */}
                                                <div 
                                                    className={`absolute h-10 rounded-lg shadow-sm text-xs text-white flex items-center px-3 cursor-move select-none z-10 transition-all hover:brightness-110 hover:shadow-md ${task.status === 'done' ? 'bg-emerald-500' : task.priority === 'high' ? 'bg-red-500' : 'bg-blue-500'}`}
                                                    style={{ left: startX + 240, width: width - 4 }} 
                                                    draggable
                                                    onDragStart={(e) => handleTaskDragStart(e, task, 'move')}
                                                    title={`${task.title}: ${parseDate(task.startDate)} a ${parseDate(task.dueDate)}`}
                                                >
                                                    {/* Resize Handles */}
                                                    <div 
                                                        className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize hover:bg-white/20 rounded-l-lg"
                                                        draggable
                                                        onDragStart={(e) => { e.stopPropagation(); handleTaskDragStart(e, task, 'resize-left'); }}
                                                    ></div>
                                                    
                                                    <span className="truncate flex-1 font-bold">{width > 40 ? task.title : ''}</span>
                                                    
                                                    {/* Initials Circle */}
                                                    <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-[9px] font-bold border border-white/40 shrink-0 ml-2" title={task.responsibleName}>
                                                        {partnerInitials}
                                                    </div>

                                                    <div 
                                                        className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize hover:bg-white/20 rounded-r-lg"
                                                        draggable
                                                        onDragStart={(e) => { e.stopPropagation(); handleTaskDragStart(e, task, 'resize-right'); }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  // --- KANBAN BOARD COM DRAG & DROP ---
  const handleKanbanDragStart = (e: React.DragEvent, taskId: string) => {
      e.dataTransfer.setData('kanbanTaskId', taskId);
  };

  const handleKanbanDrop = (e: React.DragEvent, newStatus: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('kanbanTaskId');
      if (taskId) {
          onUpdateTask(taskId, { status: newStatus as any });
      }
  };

  const renderKanban = () => {
      const columns = [
          { id: 'todo', label: 'A Fazer', color: 'border-slate-300' },
          { id: 'in_progress', label: 'Em Andamento', color: 'border-blue-400' },
          { id: 'review', label: 'Revisão', color: 'border-purple-400' },
          { id: 'done', label: 'Concluído', color: 'border-emerald-400' }
      ];

      return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full overflow-hidden">
              {columns.map(col => {
                  const colTasks = filteredTasks.filter(t => t.status === col.id);
                  return (
                      <div 
                        key={col.id} 
                        className={`flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-xl border-t-4 ${col.color} h-full overflow-hidden transition-colors`}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-slate-100'); }}
                        onDragLeave={(e) => e.currentTarget.classList.remove('bg-slate-100')}
                        onDrop={(e) => { e.currentTarget.classList.remove('bg-slate-100'); handleKanbanDrop(e, col.id); }}
                      >
                          <div className="p-3 font-bold text-xs uppercase text-slate-500 flex justify-between">
                              {col.label}
                              <span className="bg-white dark:bg-slate-800 px-2 rounded-full shadow-sm">{colTasks.length}</span>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 space-y-2">
                              {colTasks.map(task => (
                                  <div 
                                    key={task.id} 
                                    draggable
                                    onDragStart={(e) => handleKanbanDragStart(e, task.id)}
                                    onClick={() => handleEditTask(task)}
                                    className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
                                  >
                                      <div className="flex justify-between items-start mb-2">
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${task.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                              {task.priority === 'high' ? 'ALTA' : task.priority === 'medium' ? 'MÉDIA' : 'BAIXA'}
                                          </span>
                                          <MoreHorizontal size={14} className="text-slate-400 opacity-0 group-hover:opacity-100"/>
                                      </div>
                                      <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1 line-clamp-2">{task.title}</h4>
                                      <div className="text-xs text-slate-500 mb-2 truncate">{task.projectName}</div>
                                      
                                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-2 mt-2">
                                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                              <CalendarIcon size={10}/> {new Date(task.dueDate).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                          </div>
                                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold border border-indigo-200" title={task.responsibleName}>
                                              {getInitials(task.responsibleName)}
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )
              })}
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gestão de Atividades</h2>
          <p className="text-slate-500 text-sm">Controle de tarefas, prazos e entregas.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
            <button 
                onClick={() => setFilterMyTasks(!filterMyTasks)}
                className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${filterMyTasks ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
            >
                <Filter size={14}/> {filterMyTasks ? 'Minhas Atividades' : 'Todas Atividades'}
            </button>

            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                <button onClick={() => setViewMode('dashboard')} className={`p-2 rounded-md transition-all ${viewMode === 'dashboard' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`} title="Dashboard"><LayoutDashboard size={18}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`} title="Lista"><List size={18}/></button>
                <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`} title="Calendário"><CalendarIcon size={18}/></button>
                <button onClick={() => setViewMode('gantt')} className={`p-2 rounded-md transition-all ${viewMode === 'gantt' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`} title="Gantt"><CalendarDays size={18}/></button>
            </div>

            <button onClick={() => handleOpenNewTask()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all">
                <Plus size={18}/> Nova
            </button>
        </div>
      </div>

      {/* DASHBOARD VIEW */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6 animate-fadeIn overflow-y-auto pr-2">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-red-500">
              <div className="flex justify-between items-start">
                <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Atrasadas</p><h3 className="text-3xl font-bold text-red-600">{kpis.delayed}</h3></div>
                <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertCircle size={20}/></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start">
                <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Para Hoje/Futuras</p><h3 className="text-3xl font-bold text-blue-600">{kpis.pending}</h3></div>
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Clock size={20}/></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-amber-500">
              <div className="flex justify-between items-start">
                <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Nesta Semana</p><h3 className="text-3xl font-bold text-amber-600">{kpis.weekTasks}</h3></div>
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><CalendarIcon size={20}/></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-emerald-500">
              <div className="flex justify-between items-start">
                <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Concluídas</p><h3 className="text-3xl font-bold text-emerald-600">{kpis.done}</h3></div>
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><CheckCircle2 size={20}/></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Carga de Trabalho */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-lg dark:text-white mb-4">Carga de Trabalho (Pendentes)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kpis.byUser.map(u => (
                    <div key={u.name} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">{getInitials(u.name)}</div>
                      <div><div className="font-bold text-sm dark:text-white">{u.name}</div><div className="text-xs text-slate-500">{u.count} atividades</div></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico de Status */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                  <h3 className="font-bold text-lg dark:text-white mb-2">Visão Geral de Status</h3>
                  <div className="flex-1 min-h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={kpis.statusDistribution} margin={{top: 5, right: 5, bottom: 5, left: -20}}>
                              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false}/>
                              <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none'}}/>
                              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                  {kpis.statusDistribution.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>

          {/* Kanban Section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><GripVertical size={20}/> Quadro de Atividades (Kanban)</h3>
              <div className="h-[500px]">
                  {renderKanban()}
              </div>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1 animate-fadeIn">
          <div className="overflow-y-auto h-full p-4 space-y-4">
            {activeProjects.length === 0 && <div className="text-center text-slate-400 py-10">Nenhum projeto em andamento.</div>}
            
            {activeProjects.map(project => {
              const pTasks = filteredTasks.filter(t => t.projectId === project.id);
              if (filterMyTasks && pTasks.length === 0) return null; 

              const isExpanded = expandedProjects.has(project.id);
              const progress = pTasks.length > 0 
                ? Math.round((pTasks.filter(t => t.status === 'done').length / pTasks.length) * 100)
                : 0;

              return (
                <div key={project.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div 
                    onClick={() => toggleProject(project.id)}
                    className="bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown size={18} className="text-slate-400"/> : <ChevronRight size={18} className="text-slate-400"/>}
                      <div className="font-bold text-slate-800 dark:text-white">{project.name}</div>
                      <span className="text-xs bg-white dark:bg-slate-700 px-2 py-0.5 rounded border dark:border-slate-600 text-slate-500">{pTasks.length} tarefas</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{width: `${progress}%`}}></div>
                        </div>
                        <span className="text-xs font-bold text-emerald-600">{progress}%</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenNewTask(project.id); }}
                        className="p-1.5 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded-lg transition-colors"
                        title="Adicionar Tarefa ao Projeto"
                      >
                        <Plus size={16}/>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                      {pTasks.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">Nenhuma tarefa encontrada.</div>}
                      {pTasks.map(task => (
                        <div key={task.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 flex justify-between items-center group transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-orange-400' : 'bg-green-400'}`} title={`Prioridade: ${task.priority}`}></div>
                            <div>
                              <div className="font-bold text-sm text-slate-800 dark:text-slate-200 cursor-pointer hover:text-indigo-600" onClick={() => handleEditTask(task)}>{task.title}</div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                {renderResponsible(task.responsibleId, task.responsibleName)}
                                <span className="flex items-center gap-1"><CalendarIcon size={12}/> {parseDate(task.dueDate)}</span>
                                {task.comments && task.comments.length > 0 && <span className="flex items-center gap-1 text-indigo-500"><MessageSquare size={12}/> {task.comments.length}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <StatusBadge status={task.status} />
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              <button onClick={() => handleEditTask(task)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><List size={16}/></button>
                              <button onClick={() => onDeleteTask(task.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && renderCalendar()}

      {/* GANTT VIEW */}
      {viewMode === 'gantt' && renderGantt()}

      {/* MODAL TASK */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título da Atividade</label>
                  <input 
                    className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Desenhar planta baixa..."
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Projeto</label>
                    <select 
                      className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white outline-none"
                      value={formData.projectId}
                      onChange={e => setFormData({...formData, projectId: e.target.value})}
                      disabled={!!editingTask} 
                    >
                      {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável</label>
                    <select 
                      className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white outline-none"
                      value={formData.responsibleId}
                      onChange={e => setFormData({...formData, responsibleId: e.target.value})}
                    >
                      {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Início</label>
                    <input type="date" className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prazo</label>
                    <input type="date" className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                      <option value="todo">A Fazer</option>
                      <option value="in_progress">Em Andamento</option>
                      <option value="review">Revisão</option>
                      <option value="done">Concluído</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridade</label>
                    <select className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição Detalhada</label>
                  <textarea 
                    rows={3}
                    className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white outline-none resize-none"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              {/* COMMENTS SECTION (Only in Edit Mode) */}
              {editingTask && (
                <div className="border-t dark:border-slate-700 pt-6">
                  <h4 className="font-bold text-sm dark:text-white mb-4 flex items-center gap-2"><MessageSquare size={16}/> Comentários</h4>
                  <div className="space-y-4 mb-4 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                    {(!editingTask.comments || editingTask.comments.length === 0) && <div className="text-center text-xs text-slate-400">Nenhum comentário ainda.</div>}
                    {editingTask.comments?.map(c => (
                      <div key={c.id} className="flex gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {c.userName.charAt(0)}
                        </div>
                        <div className="flex-1 bg-white dark:bg-slate-800 p-2 rounded-lg border dark:border-slate-700 shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-xs">{c.userName}</span>
                            <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 p-2 border rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                      placeholder="Escreva um comentário..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    />
                    <button onClick={handleAddComment} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"><Send size={18}/></button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setIsTaskModalOpen(false)} className="px-6 py-2 border rounded-lg font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Cancelar</button>
              <button onClick={handleSaveTask} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg">Salvar Atividade</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};