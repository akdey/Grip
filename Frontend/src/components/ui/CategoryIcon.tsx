import type { LucideIcon } from 'lucide-react';
import {
    Utensils,
    Pizza,
    Coffee,
    Beer,
    IceCream,
    Drumstick,
    Wine,
    GlassWater,
    Plane,
    Car,
    Bike,
    Fuel,
    Bus,
    TrainFront,
    Ship,
    ShoppingBag,
    Shirt,
    Gift,
    Tag,
    ShoppingCart,
    Home,
    Lamp,
    Zap,
    Droplets,
    Wrench,
    Key,
    Wifi,
    Smartphone,
    Gamepad2,
    Film,
    Music,
    Tv,
    Palmtree,
    Heart,
    Stethoscope,
    Pill,
    Dumbbell,
    Wallet,
    CreditCard,
    Banknote,
    Landmark,
    TrendingUp,
    PiggyBank,
    Baby,
    Dog,
    Trees,
    Rocket,
    Shield,
    Lock,
    Bell,
    Book,
    Briefcase,
    HelpCircle,
    Sparkles,
    Truck,
    Store,
    Map,
    Leaf,
    User,
    ParkingCircle,
    Martini,
    PartyPopper,
    Users,
    Clock,
    Scale,
    SlidersHorizontal,
    Sliders,
    ArrowLeftRight,
    RefreshCw,
    RotateCcw,
    Calculator,
    Coins,
    Equal,
    Scissors,
    Cookie,
    CakeSlice,
    Calendar,
    CalendarCheck,
    CalendarClock,
    PlusCircle,
    MinusCircle,
    Plus,
    Minus
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
    // Food & Dining
    'Utensils': Utensils,
    'Pizza': Pizza,
    'Coffee': Coffee,
    'Beer': Beer,
    'IceCream': IceCream,
    'Drumstick': Drumstick,
    'Wine': Wine,
    'GlassWater': GlassWater,
    'Truck': Truck,
    'Store': Store,
    'Leaf': Leaf,
    'Cookie': Cookie,
    'CakeSlice': CakeSlice,

    // Transport
    'Plane': Plane,
    'Car': Car,
    'Bike': Bike,
    'Fuel': Fuel,
    'Bus': Bus,
    'TrainFront': TrainFront,
    'Ship': Ship,
    'Map': Map,

    // Shopping
    'ShoppingBag': ShoppingBag,
    'Shirt': Shirt,
    'Gift': Gift,
    'Tag': Tag,
    'ShoppingCart': ShoppingCart,

    // Home & Bills
    'Home': Home,
    'Lamp': Lamp,
    'Zap': Zap,
    'Droplets': Droplets,
    'Wrench': Wrench,
    'Key': Key,
    'Wifi': Wifi,
    'Smartphone': Smartphone,

    // Entertainment
    'Gamepad2': Gamepad2,
    'Film': Film,
    'Music': Music,
    'Tv': Tv,
    'Palmtree': Palmtree,

    // Health & Grooming
    'Heart': Heart,
    'Stethoscope': Stethoscope,
    'Pill': Pill,
    'Dumbbell': Dumbbell,
    'Scissors': Scissors,

    // Finance & Balance Adjustment
    'Wallet': Wallet,
    'CreditCard': CreditCard,
    'Banknote': Banknote,
    'Landmark': Landmark,
    'TrendingUp': TrendingUp,
    'PiggyBank': PiggyBank,
    'Clock': Clock,
    'Scale': Scale,
    'SlidersHorizontal': SlidersHorizontal,
    'Sliders': Sliders,
    'ArrowLeftRight': ArrowLeftRight,
    'RefreshCw': RefreshCw,
    'RotateCcw': RotateCcw,
    'Calculator': Calculator,
    'Coins': Coins,
    'Equal': Equal,
    'PlusCircle': PlusCircle,
    'MinusCircle': MinusCircle,
    'Plus': Plus,
    'Minus': Minus,
    'Calendar': Calendar,
    'CalendarCheck': CalendarCheck,
    'CalendarClock': CalendarClock,

    // Misc
    'Baby': Baby,
    'Dog': Dog,
    'Trees': Trees,
    'Rocket': Rocket,
    'Shield': Shield,
    'Lock': Lock,
    'Bell': Bell,
    'Book': Book,
    'Briefcase': Briefcase,
    'Sparkles': Sparkles,
    'HelpCircle': HelpCircle,
    'User': User,
    'ParkingCircle': ParkingCircle,
    'Martini': Martini,
    'PartyPopper': PartyPopper,
    'Users': Users,
};

export const CATEGORIZED_LUCIDE_ICONS = [
    { name: 'Food', icons: ['Utensils', 'Pizza', 'Coffee', 'Beer', 'IceCream', 'Drumstick', 'Wine', 'GlassWater', 'Cookie', 'CakeSlice', 'Truck', 'Store', 'Leaf'] },
    { name: 'Transport', icons: ['Plane', 'Car', 'Bike', 'Fuel', 'Bus', 'TrainFront', 'Ship', 'Map'] },
    { name: 'Shopping', icons: ['ShoppingBag', 'Shirt', 'Gift', 'Tag', 'ShoppingCart'] },
    { name: 'Home', icons: ['Home', 'Lamp', 'Zap', 'Droplets', 'Wrench', 'Key', 'Wifi', 'Smartphone'] },
    { name: 'Entertainment', icons: ['Gamepad2', 'Film', 'Music', 'Tv', 'Palmtree'] },
    { name: 'Health & Grooming', icons: ['Heart', 'Stethoscope', 'Pill', 'Dumbbell', 'Scissors'] },
    { name: 'Finance', icons: ['Wallet', 'CreditCard', 'Banknote', 'Landmark', 'TrendingUp', 'PiggyBank', 'Scale', 'PlusCircle', 'MinusCircle', 'CalendarCheck', 'CalendarClock', 'SlidersHorizontal', 'ArrowLeftRight', 'Calculator', 'Coins', 'RefreshCw', 'Clock'] },
    { name: 'Misc', icons: ['Baby', 'Dog', 'Trees', 'Rocket', 'Shield', 'Lock', 'Bell', 'Book', 'Briefcase', 'ParkingCircle', 'Martini', 'PartyPopper', 'Users'] },
];

interface CategoryIconProps {
    name?: string | null;
    size?: number;
    color?: string;
    className?: string;
    fallback?: React.ReactNode;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, size = 20, color, className, fallback }) => {
    if (!name) {
        return <>{fallback || <HelpCircle size={size} className={className} />}</>;
    }

    // Direct match
    let Icon = ICON_MAP[name];

    // Case-insensitive / formatted alias lookup
    if (!Icon) {
        const cleanName = name.toLowerCase().replace(/[-_\s&]/g, '');
        const matchedKey = Object.keys(ICON_MAP).find(
            (k) => k.toLowerCase().replace(/[-_\s&]/g, '') === cleanName
        );
        if (matchedKey) {
            Icon = ICON_MAP[matchedKey];
        } else if (cleanName.includes('addition') || cleanName.includes('addbalance') || cleanName === 'plus') {
            Icon = PlusCircle;
        } else if (cleanName.includes('deduction') || cleanName.includes('deductbalance') || cleanName === 'minus') {
            Icon = MinusCircle;
        } else if (cleanName.includes('balance') || cleanName.includes('adjust') || cleanName.includes('reconcil')) {
            // Intelligent fallback for balance adjustment variations
            Icon = Scale;
        } else if (cleanName.includes('barber') || cleanName.includes('groom') || cleanName.includes('hair') || cleanName.includes('scissor')) {
            Icon = Scissors;
        } else if (cleanName.includes('treat') || cleanName.includes('cookie') || cleanName.includes('snack')) {
            Icon = Cookie;
        } else if (cleanName.includes('quarterly') || cleanName.includes('contribution')) {
            Icon = CalendarCheck;
        }
    }

    if (!Icon) {
        return <>{fallback || <HelpCircle size={size} className={className} />}</>;
    }

    return <Icon size={size} color={color} className={className} />;
};
