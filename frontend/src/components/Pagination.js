import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  /**
   * Gera o array de páginas com elipses.
   * Sempre mostra: primeira, última, a atual e 1 vizinho de cada lado.
   * Usa '...' onde há lacunas.
   */
  const getPageRange = () => {
    const delta = 1; // vizinhos ao redor da página atual
    const range = [];

    // Limites do bloco central (ao redor da página atual)
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    range.push(1); // sempre exibe a 1ª página

    if (rangeStart > 2) {
      range.push('...');
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      range.push(i);
    }

    if (rangeEnd < totalPages - 1) {
      range.push('...');
    }

    if (totalPages > 1) {
      range.push(totalPages); // sempre exibe a última página
    }

    return range;
  };

  const pages = getPageRange();

  return (
    <div className="pagination">
      <div className="pagination-controls">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="pagination-btn"
        >
          ← Anterior
        </button>

        {pages.map((page, index) =>
          page === '...' ? (
            <span
              key={`ellipsis-${index}`}
              className="pagination-ellipsis"
              style={{
                padding: '0 0.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                color: 'var(--text-muted, #6B7280)',
                userSelect: 'none',
              }}
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`pagination-page ${page === currentPage ? 'active' : ''}`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="pagination-btn"
        >
          Próximo →
        </button>
      </div>
      <span className="pagination-info">
        Exibindo {startItem}–{endItem} de {totalItems} registros
      </span>
    </div>
  );
};

export default Pagination;
