'use client'

import { useState, useEffect } from 'react'
import styles from './StatsCards.module.css'

interface StatsCardsProps {
  stats: {
    panelCount: number
    maxPanels: number
    capacity: number
    annualEnergy: number
    annualSavings: number
    co2Reduction: number
  }
  onClose: () => void
}

interface StatCard {
  id: string
  title: string
  value: string
  unit: string
  icon: string
  color: string
  description: string
  position: { x: number; y: number }
}

export default function StatsCards({ stats, onClose }: StatsCardsProps) {
  const [cards, setCards] = useState<StatCard[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const initialCards: StatCard[] = [
      {
        id: 'panels',
        title: 'Solar Panels',
        value: stats.panelCount.toString(),
        unit: `/${stats.maxPanels}`,
        icon: 'solar-panel',
        color: 'var(--accent-primary)',
        description: 'Panels placed on roof',
        position: { x: 24, y: 120 }
      },
      {
        id: 'capacity',
        title: 'System Capacity',
        value: stats.capacity.toFixed(1),
        unit: 'kW',
        icon: 'bolt',
        color: '#f59e0b',
        description: 'Total power generation',
        position: { x: 24, y: 200 }
      },
      {
        id: 'energy',
        title: 'Annual Energy',
        value: (stats.annualEnergy / 1000).toFixed(1),
        unit: 'MWh/year',
        icon: 'leaf',
        color: '#10b981',
        description: 'Yearly energy production',
        position: { x: 24, y: 280 }
      },
      {
        id: 'savings',
        title: 'Annual Savings',
        value: '$' + (stats.annualSavings / 1000).toFixed(1),
        unit: 'k/year',
        icon: 'piggy-bank',
        color: '#8b5cf6',
        description: 'Money saved yearly',
        position: { x: 24, y: 360 }
      }
    ]

    setCards(initialCards)
    setIsVisible(true)
  }, [stats])

  const handleCardDrag = (cardId: string, newPosition: { x: number; y: number }) => {
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, position: newPosition } : card
    ))
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for animation to complete
  }

  if (!isVisible) return null

  return (
    <div className={styles.statsOverlay}>
      <div className={styles.statsHeader}>
        <h2>Live Statistics</h2>
        <button className={styles.closeButton} onClick={handleClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      {cards.map((card, index) => (
        <StatCard
          key={card.id}
          card={card}
          index={index}
          onDrag={(newPosition) => handleCardDrag(card.id, newPosition)}
        />
      ))}

      {/* Progress Overview */}
      <div className={styles.progressCard} style={{ left: 24, top: 460 }}>
        <div className={styles.progressHeader}>
          <h4>Progress Overview</h4>
          <span>{((stats.panelCount / stats.maxPanels) * 100).toFixed(0)}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(stats.panelCount / stats.maxPanels) * 100}%` }}
          ></div>
        </div>
        <div className={styles.progressText}>
          {stats.panelCount} of {stats.maxPanels} panels placed
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  card: StatCard
  index: number
  onDrag: (position: { x: number; y: number }) => void
}

function StatCard({ card, index, onDrag }: StatCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setIsDragging(true)
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const newPosition = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    }

    // Constrain to viewport
    newPosition.x = Math.max(0, Math.min(window.innerWidth - 200, newPosition.x))
    newPosition.y = Math.max(0, Math.min(window.innerHeight - 100, newPosition.y))

    onDrag(newPosition)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  return (
    <div
      className={`${styles.statCard} ${isDragging ? styles.dragging : ''}`}
      style={{
        left: card.position.x,
        top: card.position.y,
        animationDelay: `${index * 100}ms`
      }}
      onMouseDown={handleMouseDown}
    >
      <div className={styles.cardHeader}>
        <div
          className={styles.cardIcon}
          style={{ color: card.color }}
        >
          <i className={`fas fa-${card.icon}`}></i>
        </div>
        <div className={styles.dragHandle}>
          <i className="fas fa-grip-dots"></i>
        </div>
      </div>

      <div className={styles.cardContent}>
        <div className={styles.cardValue}>
          {card.value}
          <span className={styles.cardUnit}>{card.unit}</span>
        </div>
        <div className={styles.cardTitle}>{card.title}</div>
        <div className={styles.cardDescription}>{card.description}</div>
      </div>

      <div className={styles.cardGlow} style={{ background: card.color + '20' }}></div>
    </div>
  )
}