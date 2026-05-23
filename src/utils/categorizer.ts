type CategoryName =
  | 'Alimentación'
  | 'Transporte'
  | 'Entretenimiento'
  | 'Servicios'
  | 'Suscripciones'
  | 'Salud'
  | 'Ropa'
  | 'Transferencias'
  | 'Cuotas'
  | 'Otros';

const CATEGORY_RULES: Array<{ patterns: RegExp[]; category: CategoryName }> = [
  {
    patterns: [/bank transfer|transferencia|transfer/i],
    category: 'Transferencias',
  },
  {
    patterns: [/debt engine|cuota|prestamo|credito|loan|financiacion|pago deuda/i],
    category: 'Cuotas',
  },
  {
    patterns: [
      /carrefour|walmart|jumbo|disco|coto|dia|supermercado|almacen|verduleria|panaderia|sushi|mcdonald|burger|pizza|rappi|pedidosya|mcdonalds|kfc|subway|starbucks|cafe|restaurant|resto|comida|mercado|chango|vea|toledo|vital|la anonima|el super|hipermayor|diarco|cordiez|makro|mayorista/i,
    ],
    category: 'Alimentación',
  },
  {
    patterns: [/uber|cabify|taxi|colectivo|subte|tren|peaje|nafta|ypf|shell|axion|repsol|combustible|estacion|proximity payment|pago qr|transporte|bus|remis|aeropuerto|aerolinea|flybondi|jetsmart|aeromexico/i],
    category: 'Transporte',
  },
  {
    patterns: [/netflix|spotify|disney|hbo|amazon prime|youtube premium|twitch|steam|playstation|xbox|cine|teatro|flow|directv|apple tv|paramount|crunchyroll|deezer|mubi/i],
    category: 'Suscripciones',
  },
  {
    patterns: [/pelicula|juego|boliche|bar|cerveceria|bowling|escape room|entretenimiento|evento|concert|recital|casino|tragamonedas/i],
    category: 'Entretenimiento',
  },
  {
    patterns: [/luz|edesur|edenor|agua|aysa|gas|metrogas|telefono|internet|claro|personal|movistar|fibertel|telecom|servicio|epec|edelap|eden|edes|camuzzi|naturgy|expensas|alquiler|inmobiliaria/i],
    category: 'Servicios',
  },
  {
    patterns: [/farmacia|medicamento|medico|doctor|clinica|hospital|salud|obra social|prepaga|osde|swiss medical|dentista|farmacity|drogueria|sanatorio|laboratorio/i],
    category: 'Salud',
  },
  {
    patterns: [/zara|h&m|forever|ropa|indumentaria|calzado|zapatilla|nike|adidas|falabella|ripley|gap|levis|wrangler|kosiuko|akiabara|cardón|mimo|maria cher/i],
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
  'Transferencias',
  'Cuotas',
  'Otros',
];
