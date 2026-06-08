import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Rarity = 'Comum' | 'Incomum' | 'Raro' | 'Epico' | 'Lendario'

type Prize = {
  label: string
  rarity: Rarity
}

type SpinHistory = {
  id: string
  date: string
  prize: string
  rarity: Rarity
}

type Achievement = {
  id: string
  icon: string
  name: string
  description: string
  secret?: boolean
}

type AchievementUnlock = {
  id: string
  unlockedAt: string
}

type StoredState = {
  history: SpinHistory[]
  achievements: AchievementUnlock[]
  lastSpinAt: string | null
  spinsWithoutLegendary: number
  fragments: string[]
}

const STORAGE_KEY = 'love-rewards-v1'
// const COOLDOWN_MS = 24 * 60 * 60 * 1000
const hiddenFragmentVariable = 'zecolino'

const initialState: StoredState = {
  history: [],
  achievements: [],
  lastSpinAt: null,
  spinsWithoutLegendary: 0,
  fragments: [],
}

const prizes: Record<Rarity, string[]> = {
  Comum: [
    '🍫 Brigadeiro feito na hora',
    '🎬 Cinema com filme de sua escolha', 
    '🍰 Sobremesa da sua escolha', 
    '🛋️ 30 minutos de cafuné',
    '💆 Massagem rápida',
  ],
  Incomum: [
    '🥞 Café em um lugar especial', 
    '📺 Maratona de séries sem distrações', 
    '🎮 Escolher atividade da noite', 
    '🍔 Escolha livre do próximo jantar',
  ],
  Raro: [
    '💅 Dia de autocuidado',
    '🌅 Date surpresa', 
    '🎁 Surpresa misteriosa',
  ],
  Epico: [
    '🌹 Date especial completo',
    '🚙 Viagem de fim de semana',
  ],
  Lendario: [
    '👑 Presente premium',
  ],
};

const rarityWeights: Record<Rarity, number> = {
  Comum: 35,
  Incomum: 30,
  Raro: 20,
  Epico: 10,
  Lendario: 5,
}

// Create alternating segments proportional to rarity weights (20 total segments)
const totalSegments = 20
const alternatingPattern: Rarity[] = [
  'Comum', 'Incomum', 'Raro',
  'Comum', 'Incomum', 'Epico',
  'Comum', 'Incomum', 'Raro',
  'Comum', 'Incomum', 'Lendario',
  'Comum', 'Incomum', 'Epico',
  'Comum', 'Incomum', 'Raro',
  'Comum', 'Raro',
]

const wheelSegments: Array<{ rarity: Rarity; index: number }> = alternatingPattern.map(
  (rarity, index) => ({ rarity, index })
)

const degreesPerSegment = 360 / totalSegments

const rarityCssVar: Record<Rarity, string> = {
  Comum: 'var(--rarity-comum)',
  Incomum: 'var(--rarity-incomum)',
  Raro: 'var(--rarity-raro)',
  Epico: 'var(--rarity-epico)',
  Lendario: 'var(--rarity-lendario)',
}

const wheelGradient = `conic-gradient(from 0deg, ${wheelSegments
  .map(({ rarity }, index) => {
    const start = index * degreesPerSegment
    const end = (index + 1) * degreesPerSegment
    return `${rarityCssVar[rarity]} ${start}deg ${end}deg`
  })
  .join(', ')})`

function pointerAngleFromRotation(rotationDeg: number) {
  const normalized = ((rotationDeg % 360) + 360) % 360
  return (360 - normalized + 360) % 360
}

function segmentIndexFromPointerAngle(angleDeg: number) {
  const normalized = ((angleDeg % 360) + 360) % 360
  return Math.floor(normalized / degreesPerSegment) % totalSegments
}

const achievements: Achievement[] = [
  {
    id: 'first-spin',
    icon: '🎲',
    name: 'Você confiou no sistema',
    description: 'Primeiro giro registrado com sucesso.',
  },
  {
    id: 'ten-spins',
    icon: '🎰',
    name: 'Usuária Persistente',
    description: '10 giros completos. A amostra já está ficando interessante.',
  },
  {
    id: 'fifty-spins',
    icon: '🤑',
    name: 'Teste de Carga Aprovado',
    description: '50 giros sem derrubar o sistema.',
  },
  {
    id: 'hundred-spins',
    icon: '🏆',
    name: 'QA Certificada',
    description: '100 giros. Relatório final: aprovada.',
  },
  {
    id: 'first-legendary',
    icon: '💎',
    name: 'Finalmente o Loot Veio',
    description: 'Primeiro prêmio lendário desbloqueado.',
  },
  {
    id: 'devtools',
    icon: '👀',
    name: 'Melhor QA do Mundo',
    description: 'Hmmm... espertinha.',
    secret: true,
  },
  {
    id: 'first-commit',
    icon: '👩‍❤️‍👨',
    name: 'Primeiro Commit',
    description: 'Foi aqui que tudo começou.',
    secret: true,
  },
  {
    id: 'production-deploy',
    icon: '💍',
    name: 'Deploy em Produção',
    description: 'Build aprovada. Mudanças permanentes aplicadas.',
    secret: true,
  },
  {
    id: 'barcelona',
    icon: '💃',
    name: 'Vamos nos mudar?',
    description: 'Feature flag encontrada.',
    secret: true,
  },
  {
    id: 'zeca-mom',
    icon: '👩‍❤️‍👨',
    name: 'Mamãe do Zeca',
    description: 'Todos os fragmentos reunidos.',
    secret: true,
  },
  {
    id: 'completion',
    icon: '❤️‍🔥',
    name: '100% Completion',
    description: 'Mas a melhor conquista é ter você na minha vida.',
    secret: true,
  },
]

const fragmentWords = ['zecare', 'zelele', 'zeco', hiddenFragmentVariable]
const typedTriggers: Record<string, string> = {
  '30042018': 'first-commit',
  '14122023': 'production-deploy',
  barcelona: 'barcelona',
}

const rarityClass: Record<Rarity, string> = {
  Comum: 'common',
  Incomum: 'uncommon',
  Raro: 'rare',
  Epico: 'epic',
  Lendario: 'legendary',
}

const rarityLabel: Record<Rarity, string> = {
  Comum: 'Comum',
  Incomum: 'Incomum',
  Raro: 'Raro',
  Epico: 'Épico',
  Lendario: 'Lendário',
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState
  } catch {
    return initialState
  }
}

function saveState(state: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function randomUnit() {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] / 0xffffffff
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

// function formatCountdown(ms: number) {
//   const safeMs = Math.max(0, ms)
//   const hours = Math.floor(safeMs / 3_600_000)
//   const minutes = Math.floor((safeMs % 3_600_000) / 60_000)
//   const seconds = Math.floor((safeMs % 60_000) / 1000)

//   return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
//     2,
//     '0',
//   )}:${String(seconds).padStart(2, '0')}`
// }

function App() {
  const [state, setState] = useState<StoredState>(() => loadState())
  // const [now, setNow] = useState(() => Date.now())
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [toast, setToast] = useState('')
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false)
  const [resultModal, setResultModal] = useState<Prize | null>(null)
  const typedBuffer = useRef('')
  const stateRef = useRef(state)

  const unlockedIds = useMemo(
    () => new Set(state.achievements.map((item) => item.id)),
    [state.achievements],
  )

  const lastPrize = state.history[0]
  // const lastSpinMs = state.lastSpinAt ? new Date(state.lastSpinAt).getTime() : 0
  // const remainingMs = state.lastSpinAt ? lastSpinMs + COOLDOWN_MS - now : 0
  const canSpin = !isSpinning // Timing disabled
  const unlockedAchievements = achievements.filter((item) =>
    unlockedIds.has(item.id),
  )
  const publicAchievements = achievements.filter((item) => !item.secret)
  const totalForCompletion = achievements.length
  const completionPercent = Math.round(
    (unlockedAchievements.length / totalForCompletion) * 100,
  )
  const baseProbabilities = Object.entries(rarityWeights) as Array<[Rarity, number]>

  function unlockAchievement(id: string, message?: string) {
    if (stateRef.current.achievements.some((item) => item.id === id)) return

    setState((current) => {
      if (current.achievements.some((item) => item.id === id)) return current

      return {
        ...current,
        achievements: [
          ...current.achievements,
          { id, unlockedAt: new Date().toISOString() },
        ],
      }
    })

    const achievement = achievements.find((item) => item.id === id)
    setToast(message ?? `${achievement?.icon} Conquista desbloqueada: ${achievement?.name}`)
  }

  async function handleSpin() {
    if (!canSpin) return

    const randomSegmentIndex = Math.floor(randomUnit() * totalSegments)

    const marginDeg = degreesPerSegment * 0.05
    const minDeg = randomSegmentIndex * degreesPerSegment + marginDeg
    const maxDeg = (randomSegmentIndex + 1) * degreesPerSegment - marginDeg
    const targetPointerAngle = minDeg + randomUnit() * (maxDeg - minDeg)

    const currentMod = ((rotation % 360) + 360) % 360
    const landingOffset =
      (360 - targetPointerAngle - currentMod + 360) % 360
    const finalRotation = rotation + 1080 + landingOffset

    setIsSpinning(true)
    setToast('')
    setRotation(finalRotation)

    window.setTimeout(() => {
      const landedSegmentIndex = segmentIndexFromPointerAngle(
        pointerAngleFromRotation(finalRotation),
      )
      const landedRarity = wheelSegments[landedSegmentIndex].rarity
      const options = prizes[landedRarity]
      const finalPrize: Prize = {
        label: options[Math.floor(randomUnit() * options.length)],
        rarity: landedRarity,
      }

      const date = new Date().toISOString()
      const entry: SpinHistory = {
        id: crypto.randomUUID(),
        date,
        prize: finalPrize.label,
        rarity: finalPrize.rarity,
      }

      setState((current) => {
        const history = [entry, ...current.history]
        return {
          ...current,
          history,
          lastSpinAt: date,
          spinsWithoutLegendary:
            finalPrize.rarity === 'Lendario'
              ? 0
              : current.spinsWithoutLegendary + 1,
        }
      })

      setIsSpinning(false)
      setResultModal(finalPrize)
    }, 1800)
  }

  async function handleShareModal(prize: Prize) {
    await handleShare(prize)
    setResultModal(null)
  }

  async function handleShare(wonPrize?: Prize) {
    const prize = wonPrize?.label ?? lastPrize?.prize

    if (!prize) return

    const text = `Love Rewards(TM)\n\nAcabei de ganhar:\n${prize}\n\nO sistema oficial informa que o desenvolvedor encontra-se em débito.`

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Love Rewards(TM)', text })
      } else {
        await navigator.clipboard.writeText(text)
        setToast('Texto copiado para a área de transferência.')
      }
    } catch {
      await navigator.clipboard.writeText(text)
      setToast('Texto copiado para a área de transferência.')
    }
  }

  function registerFragment(word: string) {
    setState((current) => {
      if (current.fragments.includes(word)) return current

      const fragments = [...current.fragments, word]
      const next = { ...current, fragments }
      setToast(`Fragmento encontrado (${fragments.length}/4)`)

      if (fragments.length === fragmentWords.length) {
        window.setTimeout(() => unlockAchievement('zeca-mom'), 250)
      }

      return next
    })
  }

  useEffect(() => {
    stateRef.current = state
    saveState(state)

    const missingCompletion = !state.achievements.some(
      (item) => item.id === 'completion',
    )
    const completedBaseAchievements = achievements
      .filter((item) => item.id !== 'completion')
      .every((item) => state.achievements.some((unlock) => unlock.id === item.id))

    if (missingCompletion && completedBaseAchievements) {
      unlockAchievement(
        'completion',
        'Parabéns. Você conseguiu todas as conquistas. Mas a melhor conquista é ter você na minha vida.',
      )
    }
  }, [state])

  useEffect(() => {
    if (state.history.length >= 1) unlockAchievement('first-spin')
    if (state.history.length >= 10) unlockAchievement('ten-spins')
    if (state.history.length >= 50) unlockAchievement('fifty-spins')
    if (state.history.length >= 100) unlockAchievement('hundred-spins')
    if (state.history.some((item) => item.rarity === 'Lendario')) {
      unlockAchievement('first-legendary')
    }
  }, [state.history])

  // useEffect(() => {
  //   const timer = window.setInterval(() => setNow(Date.now()), 1000)
  //   return () => window.clearInterval(timer)
  // }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.length !== 1) return

      typedBuffer.current = `${typedBuffer.current}${event.key.toLowerCase()}`.slice(
        -24,
      )

      Object.entries(typedTriggers).forEach(([trigger, achievementId]) => {
        if (typedBuffer.current.endsWith(trigger)) {
          unlockAchievement(achievementId)
        }
      })

      fragmentWords.forEach((word) => {
        if (typedBuffer.current.endsWith(word)) registerFragment(word)
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      const devtoolsOpen =
        window.outerWidth - window.innerWidth > 160 ||
        window.outerHeight - window.innerHeight > 160

      if (devtoolsOpen) {
        unlockAchievement('devtools', 'Hmmm... espertinha.')
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isAchievementsOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAchievementsOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isAchievementsOpen])

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => {
      setToast('')
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <main className="app-shell">
      <span className="hidden-fragment" aria-hidden="true">
        zeco
      </span>

      <section className="hero" aria-labelledby="product-title">
        <div className="hero-copy">
          <h1 id="product-title">Love Rewards</h1>
          <p className="product-subtitle">Sistema oficial de recompensas</p>
          <p>
            Presente digital para Gabriela, aprovado pelo desenvolvedor e
            eternamente em revisão pela QA oficial.
          </p>
        </div>
      </section>

      <section className="wheel-section">
        <div className="wheel-stage">
          <div
            className="wheel"
            style={{
              transform: `rotate(${rotation}deg)`,
              background: wheelGradient,
            }}
            aria-hidden="true"
          />
          <div className="wheel-pointer" aria-hidden="true" />
        </div>

        <div className="spin-panel">
          <h2>Roleta diária</h2>
          <div className="probability-list" aria-label="Probabilidade base dos prêmios">
            {baseProbabilities.map(([rarity, weight]) => (
              <div key={rarity} className="probability-row">
                <span>{rarityLabel[rarity]}</span>
                <div className="probability-track">
                  <span
                    className={`probability-fill ${rarityClass[rarity]}`}
                    style={{ width: `${weight}%` }}
                  />
                </div>
                <strong>{weight}%</strong>
              </div>
            ))}
          </div>
          <button className="primary-button" onClick={handleSpin} disabled={!canSpin}>
            {isSpinning ? 'Girando...' : 'Girar'}
          </button>
          {lastPrize && (
            <button className="ghost-button" onClick={() => handleShare()}>
              Compartilhar último prêmio
            </button>
          )}
        </div>
      </section>

      {toast && <p className="toast">{toast}</p>}

      {resultModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setResultModal(null)}
        >
          <div
            className="result-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="result-header">
              <p className="result-title">Parabéns, você acabou de ganhar um prêmio</p>
              <span className={`rarity-pill result-rarity ${rarityClass[resultModal.rarity]}`}>
                {rarityLabel[resultModal.rarity]}
              </span>
            </div>
            <p className="result-prize">{resultModal.label}</p>
            <button
              className="primary-button"
              onClick={() => handleShareModal(resultModal)}
            >
              Compartilhar
            </button>
          </div>
        </div>
      )}

      <section className="history-section">
        <div className="section-heading">
          <h2>Prêmios recebidos</h2>
        </div>
        <div className="history-list">
          {state.history.length === 0 ? (
            <p className="empty-state">Nenhum giro registrado ainda.</p>
          ) : (
            state.history.slice(0, 8).map((item) => (
              <article key={item.id} className="history-item">
                <div>
                  <strong>{item.prize}</strong>
                  <span>{formatDate(item.date)}</span>
                </div>
                <span className={`rarity-pill ${rarityClass[item.rarity]}`}>
                  {rarityLabel[item.rarity]}
                </span>
              </article>
            ))
          )}
        </div>
      </section>

      <button
        className="achievement-fab"
        type="button"
        aria-label="Abrir conquistas"
        onClick={() => setIsAchievementsOpen(true)}
      >
        <span className="achievement-fab-icon" aria-hidden="true">
          🏆
        </span>
      </button>

      {isAchievementsOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setIsAchievementsOpen(false)}
        >
          <div
            className="achievement-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="achievement-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="panel-label">Conquistas</p>
                <h2 id="achievement-modal-title">{completionPercent}% completo</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label="Fechar conquistas"
                onClick={() => setIsAchievementsOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="achievement-list">
              {publicAchievements.map((achievement) => {
                const unlock = state.achievements.find(
                  (item) => item.id === achievement.id,
                )

                return (
                  <article
                    key={achievement.id}
                    className={`achievement-item ${unlock ? 'unlocked' : 'locked'}`}
                  >
                    <div>
                      <strong>
                        {unlock
                          ? `${achievement.icon} ${achievement.name}`
                          : 'Conquista oculta'}
                      </strong>
                      <span>
                        {unlock
                          ? achievement.description
                          : 'Continue explorando o sistema.'}
                      </span>
                    </div>
                    <small>{unlock ? formatDate(unlock.unlockedAt) : 'Bloqueada'}</small>
                  </article>
                )
              })}
              {achievements
                .filter(
                  (achievement) => achievement.secret && unlockedIds.has(achievement.id),
                )
                .map((achievement) => {
                  const unlock = state.achievements.find(
                    (item) => item.id === achievement.id,
                  )

                  return (
                    <article key={achievement.id} className="achievement-item unlocked">
                      <div>
                        <strong>{`${achievement.icon} ${achievement.name}`}</strong>
                        <span>{achievement.description}</span>
                      </div>
                      <small>{unlock ? formatDate(unlock.unlockedAt) : ''}</small>
                    </article>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      <footer>
        <div className="footer-signature">
          <strong>Love Rewards(TM) v1.0.0</strong>
          <span>Desenvolvido com amor por Guilherme</span>
          <span>QA Oficial: Gabriela</span>
        </div>
        <p>Nenhum bug conhecido. A QA discorda.</p>
      </footer>
    </main>
  )
}

export default App

