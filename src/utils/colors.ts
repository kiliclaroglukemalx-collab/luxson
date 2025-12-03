export const INSTAGRAM_COLORS = [
  '#E1306C',
  '#F56040',
  '#FCAF45',
  '#C13584',
  '#833AB4',
  '#405DE6',
  '#5B51D8',
  '#4285F4',
  '#34A853',
  '#FBBC04',
  '#EA4335',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DFE6E9',
  '#74B9FF',
  '#A29BFE',
  '#FD79A8'
]

export const getRandomColor = (usedColors: string[]): string => {
  const availableColors = INSTAGRAM_COLORS.filter(c => !usedColors.includes(c))
  if (availableColors.length === 0) {
    return INSTAGRAM_COLORS[Math.floor(Math.random() * INSTAGRAM_COLORS.length)]
  }
  return availableColors[Math.floor(Math.random() * availableColors.length)]
}
