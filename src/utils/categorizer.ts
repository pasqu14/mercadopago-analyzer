type CategoryName =
  | 'Alimentación'
  | 'Transporte'
  | 'Entretenimiento'
  | 'Servicios'
  | 'Suscripciones'
  | 'Salud'
  | 'Ropa'
  | 'Otros';

const CATEGORY_RULES: Array<{ patterns: RegExp[]; category: CategoryName }> = [
  {
    patterns: [
      /carrefour|walmart|jumbo|disco|coto|dia|supermercado|almacen|verduleria|panaderia|sushi|mcdonald|burger|pizza|rappi|pedidosya|mcdonalds|kfc|subway|starbucks|cafe|restaurant|resto|comida/i,
    ],
    category: 'Alimentación',
  },
  {
    patterns: [/uber|cabify|taxi|colectivo|subte|tren|peaje|nafta|ypf|shell|axion|repsol|combustible|estacion/i],
    category: 'Transporte',
  },
  {
    patterns: [/netflix|spotify|disney|hbo|amazon prime|youtube premium|twitch|steam|playstation|xbox|cine|teatro|flow|directv/i],
    category: 'Suscripciones',
  },
  {
    patterns: [/pelicula|juego|boliche|bar|cerveceria|bowling|escape room|entretenimiento|evento|concert|recital/i],
    category: 'Entretenimiento',
  },
  {
    patterns: [/luz|edesur|edenor|agua|aysa|gas|metrogas|telefono|internet|claro|personal|movistar|fibertel|telecom|servicio/i],
    category: 'Servicios',
  },
  {
    patterns: [/farmacia|medicamento|medico|doctor|clinica|hospital|salud|obra social|prepaga|osde|swiss medical|dentista/i],
    category: 'Salud',
  },
  {
    patterns: [/zara|h&m|forever|ropa|indumentaria|calzado|zapatilla|nike|adidas|adidas|falabella|ripley/i],
    category: 'Ropa',
  },
];

export function categorize(text: string): CategoryName {
  const normalized = text.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(normalized))) {
      return rule.category;
    }
  }

  return 'Otros';
}

export const VALID_CATEGORIES: CategoryName[] = [
  'Alimentación',
  'Transporte',
  'Entretenimiento',
  'Servicios',
  'Suscripciones',
  'Salud',
  'Ropa',
  'Otros',
];
