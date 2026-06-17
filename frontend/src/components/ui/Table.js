import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const Table = ({ columns, data, onEdit, onDelete }) => (
  <div style={{ overflowX: 'auto' }}>
    <table className="dark-table">
      <thead>
        <tr>
          {columns.map((col, idx) => (
            <th key={idx}>
              {col.header}
            </th>
          ))}
          {(onEdit || onDelete) && (
            <th style={{ textAlign: 'center' }}>
              Ações
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
              style={{
                padding: '40px',
                textAlign: 'center',
                color: '#156feeff',
                fontSize: '14px',
              }}
            >
              Nenhum registro encontrado
            </td>
          </tr>
        ) : (
          data.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {columns.map((col, colIdx) => (
                <td key={colIdx}>
                  {col.render ? col.render(row) : row[col.field]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="action-btn action-btn-edit"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="action-btn action-btn-delete"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default Table;
