"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileText,
  Gift,
  GripVertical,
  Heart,
  Home,
  Info,
  LogIn,
  LogOut,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Package,
  Palette,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Radio,
  ReceiptText,
  Rocket,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Shapes,
  Sparkles,
  Star,
  Store,
  Tag,
  TicketPercent,
  Trash2,
  Truck,
  Upload,
  UserRound,
  UserPlus,
  Users,
  Video,
  WalletCards,
  X,
  Zap,
  Copy,
  Menu,
  Percent,
  QrCode,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  alt?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  color?: string;
  fill?: string;
}

const SYSTEM_ICONS: Record<string, LucideIcon> = {
  ArrowRight,
  Calendar: CalendarDays,
  Cart: ShoppingBag,
  Camera,
  Category: Shapes,
  Certified: BadgeCheck,
  Chart: BarChart3,
  Check,
  ChevronDown,
  Clock: Clock3,
  Close: X,
  CreditCard,
  CustomerService: MessageCircle,
  Delete: Trash2,
  Discount: Percent,
  Download,
  Edit: Pencil,
  Eye,
  File: FileText,
  Gift,
  Help: CircleHelp,
  Home,
  Info,
  InviteFriend: UserPlus,
  Lightning: Zap,
  Live: Radio,
  Login: LogIn,
  Logout: LogOut,
  Location: MapPin,
  Lock,
  Mail,
  Megaphone,
  Message: MessageCircle,
  MyPage: UserRound,
  MyPick: Heart,
  NetworkError: WifiOff,
  Notification: Bell,
  OrderHistory: ReceiptText,
  Package,
  Pause,
  Phone,
  Play,
  Plus,
  QrCode,
  Receipt: ReceiptText,
  Reorder: GripVertical,
  Rocket,
  Search,
  Settings,
  Share: Share2,
  Sparkles,
  Star,
  Store,
  Tag,
  Truck,
  Upload,
  Users,
  Wallet: WalletCards,
  Warning: AlertTriangle,
  Wishlist: Heart,
  Video,
  Color: Palette,
  Copy,
  Coupon: TicketPercent,
  Menu,
};

export function Icon({
  name,
  size = 24,
  className = "",
  alt = "",
  style,
  strokeWidth = 1.8,
  color,
  fill = "none",
}: IconProps) {
  const SystemIcon = SYSTEM_ICONS[name];

  if (SystemIcon) {
    return (
      <SystemIcon
        size={size}
        strokeWidth={strokeWidth}
        className={className}
        style={style}
        color={color}
        fill={fill}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      />
    );
  }

  // 소셜·플랫폼·특수 일러스트 아이콘은 기존 PNG 자산을 유지한다.
  return (
    <Image
      src={`/icons/${name}.png`}
      width={size}
      height={size}
      alt={alt}
      className={className}
      style={{ display: "inline-block", ...style }}
      unoptimized
    />
  );
}
