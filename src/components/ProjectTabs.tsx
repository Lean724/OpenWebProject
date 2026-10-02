/**
 * OpenWebProject - Project Tabs Component
 * Section 4: Workspace multi-project tabs navigation.
 */
import React, { useState } from 'react';
import { Plus, X, Edit2, Check, Folder } from 'lucide-react';
import { Project, Workspace } from '../types/project';

interface ProjectTabsProps {
  workspace: Workspace;
  activeProjectId: string;
  onSwitchProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectTabs: React.FC<ProjectTabsProps> = ({
  workspace,
  activeProjectId,
  onSwitchProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newProjName, setNewProjName] = useState('');

  const startRename = (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditName(p.name);
  };

  const saveRename = (id: string) => {
    if (editName.trim()) {
      onRenameProject(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjName.trim()) {
      onCreateProject(newProjName.trim());
      setNewProjName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="h-9 bg-slate-100 border-b border-slate-200 px-3 flex items-center gap-1.5 overflow-x-auto select-none">
      <div className="flex items-center gap-1">
        {workspace.projects.map((p) => {
          const isActive = p.id === activeProjectId;
          const isEditing = editingId === p.id;

          if (isEditing) {
            return (
              <div
                key={p.id}
                className="flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-300 rounded text-xs"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename(p.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  className="w-28 text-xs font-medium text-slate-800 focus:outline-none"
                />
                <button
                  onClick={() => saveRename(p.id)}
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={p.id}
              onClick={() => onSwitchProject(p.id)}
              className={`group flex items-center gap-2 px-3 py-1 rounded-t-md text-xs font-medium cursor-pointer transition-colors border-t border-x ${
                isActive
                  ? 'bg-white text-slate-900 border-slate-200 shadow-2xs'
                  : 'bg-slate-200/60 text-slate-600 border-transparent hover:bg-slate-200/90 hover:text-slate-800'
              }`}
            >
              <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="truncate max-w-[140px]">{p.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">({p.tasks.length})</span>

              {/* Action buttons on hover */}
              <div className="items-center gap-0.5 hidden group-hover:flex ml-1">
                <button
                  onClick={(e) => startRename(p, e)}
                  className="p-0.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                  title="Renombrar proyecto"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {workspace.projects.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar proyecto "${p.name}"?`)) {
                        onDeleteProject(p.id);
                      }
                    }}
                    className="p-0.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                    title="Eliminar proyecto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Project Tab */}
      {isCreating ? (
        <form onSubmit={handleCreateSubmit} className="flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-300 rounded text-xs">
          <input
            type="text"
            placeholder="Nombre de proyecto..."
            value={newProjName}
            onChange={(e) => setNewProjName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsCreating(false);
            }}
            autoFocus
            className="w-32 text-xs font-medium text-slate-800 focus:outline-none"
          />
          <button type="submit" className="text-emerald-600 hover:text-emerald-700">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded transition-colors"
          title="Crear nuevo proyecto en el Workspace"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
