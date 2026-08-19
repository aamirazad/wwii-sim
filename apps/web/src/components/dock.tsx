"use client";

import {
	AnimatePresence,
	type MotionValue,
	motion,
	type SpringOptions,
	useMotionValue,
	useSpring,
	useTransform,
} from "motion/react";
import Link from "next/link";
import React, {
	Children,
	cloneElement,
	type RefObject,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

export type DockItemData = {
	icon: React.ReactNode;
	label: React.ReactNode;
	href: string;
	className?: string;
};

export type DockProps = {
	items: DockItemData[];
	className?: string;
	distance?: number;
	panelHeight?: number;
	baseItemSize?: number;
	dockHeight?: number;
	magnification?: number;
	spring?: SpringOptions;
	scrollContainerRef?: RefObject<HTMLElement | null>;
};

type DockItemProps = {
	className?: string;
	children: React.ReactNode;
	href: string;
	mouseX: MotionValue<number>;
	spring: SpringOptions;
	distance: number;
	baseItemSize: number;
	magnification: number;
};

function DockItem({
	children,
	className = "",
	href,
	mouseX,
	spring,
	distance,
	magnification,
	baseItemSize,
}: DockItemProps) {
	const ref = useRef<HTMLDivElement>(null);
	const isHovered = useMotionValue(0);

	const mouseDistance = useTransform(mouseX, (val) => {
		const rect = ref.current?.getBoundingClientRect() ?? {
			x: 0,
			width: baseItemSize,
		};
		return val - rect.x - baseItemSize / 2;
	});

	const targetSize = useTransform(
		mouseDistance,
		[-distance, 0, distance],
		[baseItemSize, magnification, baseItemSize],
	);
	const size = useSpring(targetSize, spring);

	return (
		<Link href={href}>
			<motion.div
				ref={ref}
				style={{
					width: size,
					height: size,
				}}
				onHoverStart={() => isHovered.set(1)}
				onHoverEnd={() => isHovered.set(0)}
				onFocus={() => isHovered.set(1)}
				onBlur={() => isHovered.set(0)}
				className={`relative inline-flex items-center justify-center rounded-sm border bg-card text-foreground shadow-sm ${className}`}
				tabIndex={0}
				role="button"
				aria-haspopup="true"
			>
				{Children.map(children, (child) =>
					React.isValidElement(child)
						? cloneElement(
								child as React.ReactElement<{
									isHovered?: MotionValue<number>;
								}>,
								{ isHovered },
							)
						: child,
				)}
			</motion.div>
		</Link>
	);
}

type DockLabelProps = {
	className?: string;
	children: React.ReactNode;
	isHovered?: MotionValue<number>;
};

function DockLabel({ children, className = "", isHovered }: DockLabelProps) {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		if (!isHovered) return;
		const unsubscribe = isHovered.on("change", (latest) => {
			setIsVisible(latest === 1);
		});
		return () => unsubscribe();
	}, [isHovered]);

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					initial={{ opacity: 0, y: 0 }}
					animate={{ opacity: 1, y: -10 }}
					exit={{ opacity: 0, y: 0 }}
					transition={{ duration: 0.2 }}
					className={`${className} absolute -top-5 left-1/2 w-fit whitespace-pre rounded-sm border bg-card px-2 py-0.5 text-xs text-foreground`}
					role="tooltip"
					style={{ x: "-50%" }}
				>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	);
}

type DockIconProps = {
	className?: string;
	children: React.ReactNode;
	isHovered?: MotionValue<number>;
};

function DockIcon({ children, className = "" }: DockIconProps) {
	return (
		<div className={`flex items-center justify-center ${className}`}>
			{children}
		</div>
	);
}

export default function Dock({
	items,
	className = "",
	spring = { mass: 0.1, stiffness: 150, damping: 12 },
	magnification = 70,
	distance = 200,
	panelHeight = 64,
	dockHeight = 256,
	baseItemSize = 50,
	scrollContainerRef,
}: DockProps) {
	const mouseX = useMotionValue(Infinity);
	const [isScrollable, setIsScrollable] = useState(false);
	const [isAtBottom, setIsAtBottom] = useState(true);
	const [isPointerOver, setIsPointerOver] = useState(false);
	const [isFocusWithin, setIsFocusWithin] = useState(false);
	const [isPinnedOpen, setIsPinnedOpen] = useState(false);

	const maxHeight = useMemo(
		() => Math.max(dockHeight, magnification + magnification / 2 + 4),
		[magnification, dockHeight],
	);
	const expandedWidth =
		items.length * baseItemSize + Math.max(0, items.length - 1) * 12 + 24;
	const isCollapsed =
		isScrollable &&
		!isAtBottom &&
		!isPointerOver &&
		!isFocusWithin &&
		!isPinnedOpen;

	useEffect(() => {
		const element = scrollContainerRef?.current;

		const updateScrollState = () => {
			const scrollHeight = element
				? element.scrollHeight
				: document.documentElement.scrollHeight;
			const viewportHeight = element
				? element.clientHeight
				: window.innerHeight;
			const scrollTop = element ? element.scrollTop : window.scrollY;
			const canScroll = scrollHeight > viewportHeight + 1;
			setIsScrollable(canScroll);
			setIsAtBottom(
				!canScroll || scrollTop + viewportHeight >= scrollHeight - 4,
			);
		};

		const handleScroll = () => {
			setIsPinnedOpen(false);
			updateScrollState();
		};

		const resizeObserver = new ResizeObserver(updateScrollState);
		if (element) {
			resizeObserver.observe(element);
			if (element.firstElementChild instanceof HTMLElement) {
				resizeObserver.observe(element.firstElementChild);
			}
			element.addEventListener("scroll", handleScroll, { passive: true });
		} else {
			resizeObserver.observe(document.body);
			window.addEventListener("scroll", handleScroll, { passive: true });
		}
		window.addEventListener("resize", updateScrollState);
		updateScrollState();

		return () => {
			resizeObserver.disconnect();
			if (element) {
				element.removeEventListener("scroll", handleScroll);
			} else {
				window.removeEventListener("scroll", handleScroll);
			}
			window.removeEventListener("resize", updateScrollState);
		};
	}, [scrollContainerRef]);

	return (
		<motion.div
			initial={false}
			animate={{
				height: isCollapsed ? 28 : panelHeight,
				width: isCollapsed ? 58 : expandedWidth,
			}}
			transition={spring}
			style={{ maxHeight, scrollbarWidth: "none" }}
			className="fixed bottom-2 left-1/2 z-[60] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-end justify-center"
			onMouseEnter={() => setIsPointerOver(true)}
			onMouseLeave={() => {
				setIsPointerOver(false);
				mouseX.set(Infinity);
			}}
			onFocusCapture={() => setIsFocusWithin(true)}
			onBlurCapture={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) {
					setIsFocusWithin(false);
				}
			}}
		>
			<motion.div
				initial={false}
				animate={{ opacity: isCollapsed ? 0 : 1, scale: isCollapsed ? 0.9 : 1 }}
				transition={{ duration: 0.18 }}
				onMouseMove={({ pageX }) => {
					mouseX.set(pageX);
				}}
				className={`${className} absolute bottom-0 left-1/2 flex w-fit -translate-x-1/2 items-end gap-3 rounded-sm border bg-background px-3 pb-2 shadow-lg ${isCollapsed ? "pointer-events-none" : ""}`}
				style={{ height: panelHeight }}
				role="toolbar"
				aria-label="Application dock"
				inert={isCollapsed}
			>
				{items.map((item, index) => (
					<DockItem
						key={index}
						className={item.className}
						href={item.href}
						mouseX={mouseX}
						spring={spring}
						distance={distance}
						magnification={magnification}
						baseItemSize={baseItemSize}
					>
						<DockIcon>{item.icon}</DockIcon>
						<DockLabel>{item.label}</DockLabel>
					</DockItem>
				))}
			</motion.div>
			<motion.button
				type="button"
				initial={false}
				animate={{
					opacity: isCollapsed ? 1 : 0,
					scale: isCollapsed ? 1 : 0.85,
				}}
				transition={{ duration: 0.18 }}
				onClick={() => setIsPinnedOpen(true)}
				className={`absolute inset-0 flex items-center justify-center gap-1.5 rounded-full border bg-background/95 px-3 shadow-lg backdrop-blur-sm ${isCollapsed ? "" : "pointer-events-none"}`}
				tabIndex={isCollapsed ? 0 : -1}
				aria-label="Expand application dock"
				aria-expanded={!isCollapsed}
			>
				{items.map((item, index) => (
					<span
						key={`${String(item.label)}-${index}`}
						className="size-1.5 rounded-full bg-foreground/65"
					/>
				))}
			</motion.button>
		</motion.div>
	);
}
