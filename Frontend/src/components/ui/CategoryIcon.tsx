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
    Clock
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

    // Health
    'Heart': Heart,
    'Stethoscope': Stethoscope,
    'Pill': Pill,
    'Dumbbell': Dumbbell,

    // Finance
    'Wallet': Wallet,
    'CreditCard': CreditCard,
    'Banknote': Banknote,
    'Landmark': Landmark,
    'TrendingUp': TrendingUp,
    'PiggyBank': PiggyBank,
    'Clock': Clock,

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
    { name: 'Food', icons: ['Utensils', 'Pizza', 'Coffee', 'Beer', 'IceCream', 'Drumstick', 'Wine', 'GlassWater', 'Truck', 'Store', 'Leaf'] },
    { name: 'Transport', icons: ['Plane', 'Car', 'Bike', 'Fuel', 'Bus', 'TrainFront', 'Ship', 'Map'] },
    { name: 'Shopping', icons: ['ShoppingBag', 'Shirt', 'Gift', 'Tag', 'ShoppingCart'] },
    { name: 'Home', icons: ['Home', 'Lamp', 'Zap', 'Droplets', 'Wrench', 'Key', 'Wifi', 'Smartphone'] },
    { name: 'Entertainment', icons: ['Gamepad2', 'Film', 'Music', 'Tv', 'Palmtree'] },
    { name: 'Health', icons: ['Heart', 'Stethoscope', 'Pill', 'Dumbbell'] },
    { name: 'Finance', icons: ['Wallet', 'CreditCard', 'Banknote', 'Landmark', 'TrendingUp', 'PiggyBank', 'Clock'] },
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
    if (!name || !ICON_MAP[name]) {
        return <>{fallback || <HelpCircle size={size} className={className} />}</>;
    }

    const Icon = ICON_MAP[name];
    return <Icon size={size} color={color} className={className} />;
};
