'use client'

import { useState, useMemo } from 'react'
import styles from './PanelSelector.module.css'
import panelsConfig from '@/config/panels.json'
import { usePanelContext } from '@/contexts/PanelContext'

interface Panel {
  id: string
  name: string
  manufacturer: string
  width: number
  height: number
  power: number
  efficiency: number
}

interface PanelSelectorProps {
  isOpen: boolean
  onClose: () => void
}

export default function PanelSelector({ isOpen, onClose }: PanelSelectorProps) {
  const { setSelectedPanel: setContextPanel } = usePanelContext()
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    minPower: '',
    maxPower: '',
    minEfficiency: '',
    maxEfficiency: '',
    minWidth: '',
    maxWidth: '',
    minHeight: '',
    maxHeight: ''
  })
  const [customPanel, setCustomPanel] = useState({
    name: '',
    manufacturer: '',
    width: '',
    height: '',
    power: '',
    efficiency: ''
  })

  const filteredPanels = useMemo(() => {
    return panelsConfig.panels.filter((panel: Panel) => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        panel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        panel.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())

      // Spec filters
      const matchesPower =
        (filters.minPower === '' || panel.power >= Number(filters.minPower)) &&
        (filters.maxPower === '' || panel.power <= Number(filters.maxPower))

      const matchesEfficiency =
        (filters.minEfficiency === '' || panel.efficiency >= Number(filters.minEfficiency)) &&
        (filters.maxEfficiency === '' || panel.efficiency <= Number(filters.maxEfficiency))

      const matchesWidth =
        (filters.minWidth === '' || panel.width >= Number(filters.minWidth)) &&
        (filters.maxWidth === '' || panel.width <= Number(filters.maxWidth))

      const matchesHeight =
        (filters.minHeight === '' || panel.height >= Number(filters.minHeight)) &&
        (filters.maxHeight === '' || panel.height <= Number(filters.maxHeight))

      return matchesSearch && matchesPower && matchesEfficiency && matchesWidth && matchesHeight
    })
  }, [searchQuery, filters])

  const handlePanelSelect = (panelId: string) => {
    setSelectedPanel(panelId)
    setShowCustomForm(false)
  }

  const handleCustomClick = () => {
    setSelectedPanel(null)
    setShowCustomForm(true)
  }

  const handleCustomInputChange = (field: string, value: string) => {
    setCustomPanel(prev => ({ ...prev, [field]: value }))
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleClearFilters = () => {
    setFilters({
      minPower: '',
      maxPower: '',
      minEfficiency: '',
      maxEfficiency: '',
      minWidth: '',
      maxWidth: '',
      minHeight: '',
      maxHeight: ''
    })
  }

  const handleApply = () => {
    if (selectedPanel) {
      const panel = panelsConfig.panels.find(p => p.id === selectedPanel)
      if (panel) {
        setContextPanel(panel)
      }
    } else if (showCustomForm) {
      const customPanelData = {
        id: 'custom',
        name: customPanel.name,
        manufacturer: customPanel.manufacturer,
        width: Number(customPanel.width),
        height: Number(customPanel.height),
        power: Number(customPanel.power),
        efficiency: Number(customPanel.efficiency)
      }
      setContextPanel(customPanelData)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <h2>Select Solar Panel</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {/* Search Bar */}
          <div className={styles.searchContainer}>
            <div className={styles.searchBar}>
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search by name or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  className={styles.clearSearch}
                  onClick={() => setSearchQuery('')}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            <button
              className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <i className="fas fa-filter"></i>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className={styles.filtersContainer}>
              <div className={styles.filtersHeader}>
                <h4>Filters</h4>
                <button className={styles.clearFiltersBtn} onClick={handleClearFilters}>
                  Clear All
                </button>
              </div>
              <div className={styles.filterGrid}>
                <div className={styles.filterGroup}>
                  <label>Power (W)</label>
                  <div className={styles.rangeInputs}>
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPower}
                      onChange={(e) => handleFilterChange('minPower', e.target.value)}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPower}
                      onChange={(e) => handleFilterChange('maxPower', e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.filterGroup}>
                  <label>Efficiency (%)</label>
                  <div className={styles.rangeInputs}>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Min"
                      value={filters.minEfficiency}
                      onChange={(e) => handleFilterChange('minEfficiency', e.target.value)}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Max"
                      value={filters.maxEfficiency}
                      onChange={(e) => handleFilterChange('maxEfficiency', e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.filterGroup}>
                  <label>Width (m)</label>
                  <div className={styles.rangeInputs}>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Min"
                      value={filters.minWidth}
                      onChange={(e) => handleFilterChange('minWidth', e.target.value)}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Max"
                      value={filters.maxWidth}
                      onChange={(e) => handleFilterChange('maxWidth', e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.filterGroup}>
                  <label>Height (m)</label>
                  <div className={styles.rangeInputs}>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Min"
                      value={filters.minHeight}
                      onChange={(e) => handleFilterChange('minHeight', e.target.value)}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Max"
                      value={filters.maxHeight}
                      onChange={(e) => handleFilterChange('maxHeight', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Predefined Panels */}
          <div className={styles.panelList}>
            {filteredPanels.length > 0 ? (
              filteredPanels.map((panel: Panel) => (
              <div
                key={panel.id}
                className={`${styles.panelCard} ${selectedPanel === panel.id ? styles.selected : ''}`}
                onClick={() => handlePanelSelect(panel.id)}
              >
                <div className={styles.panelHeader}>
                  <h3>{panel.name}</h3>
                  <span className={styles.manufacturer}>{panel.manufacturer}</span>
                </div>
                <div className={styles.panelSpecs}>
                  <div className={styles.spec}>
                    <span className={styles.label}>Dimensions:</span>
                    <span className={styles.value}>{panel.width}m × {panel.height}m</span>
                  </div>
                  <div className={styles.spec}>
                    <span className={styles.label}>Power:</span>
                    <span className={styles.value}>{panel.power}W</span>
                  </div>
                  <div className={styles.spec}>
                    <span className={styles.label}>Efficiency:</span>
                    <span className={styles.value}>{panel.efficiency}%</span>
                  </div>
                </div>
              </div>
            ))
            ) : (
              <div className={styles.noResults}>
                <i className="fas fa-search"></i>
                <p>No panels found matching your criteria</p>
              </div>
            )}
          </div>

          {/* Custom Panel Button */}
          <button
            className={`${styles.customBtn} ${showCustomForm ? styles.active : ''}`}
            onClick={handleCustomClick}
          >
            + Custom Panel
          </button>

          {/* Custom Panel Form */}
          {showCustomForm && (
            <div className={styles.customForm}>
              <h3>Custom Panel Configuration</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Panel Name</label>
                  <input
                    type="text"
                    value={customPanel.name}
                    onChange={(e) => handleCustomInputChange('name', e.target.value)}
                    placeholder="e.g., My Solar Panel"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Manufacturer</label>
                  <input
                    type="text"
                    value={customPanel.manufacturer}
                    onChange={(e) => handleCustomInputChange('manufacturer', e.target.value)}
                    placeholder="e.g., Generic Brand"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Width (meters)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={customPanel.width}
                    onChange={(e) => handleCustomInputChange('width', e.target.value)}
                    placeholder="e.g., 1.046"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Height (meters)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={customPanel.height}
                    onChange={(e) => handleCustomInputChange('height', e.target.value)}
                    placeholder="e.g., 1.690"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Power (Watts)</label>
                  <input
                    type="number"
                    value={customPanel.power}
                    onChange={(e) => handleCustomInputChange('power', e.target.value)}
                    placeholder="e.g., 400"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Efficiency (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customPanel.efficiency}
                    onChange={(e) => handleCustomInputChange('efficiency', e.target.value)}
                    placeholder="e.g., 22.6"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.applyBtn}
            onClick={handleApply}
            disabled={!selectedPanel && !showCustomForm}
          >
            Apply
          </button>
        </div>
      </div>
    </>
  )
}
