import { Variants } from "framer-motion";

/**
 * Shared Framer Motion variants for section/card entrance animations.
 * Import these into components instead of redefining inline variants,
 * per the "avoid duplicated logic" rule.
 *
 * Usage:
 *   <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
 */

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

export const fadeInDown: Variants = {
    hidden: { opacity: 0, y: -16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.96 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.3, ease: "easeOut" },
    },
};

export const slideInLeft: Variants = {
    hidden: { opacity: 0, x: -24 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

export const slideInRight: Variants = {
    hidden: { opacity: 0, x: 24 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

/**
 * Container variant for staggering children (e.g. a grid of ProjectCards
 * or SkillCards). Pair with fadeInUp (or similar) on each child.
 *
 * Usage:
 *   <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
 *       {items.map((item) => (
 *           <motion.div key={item.id} variants={fadeInUp}>...</motion.div>
 *       ))}
 *   </motion.div>
 */
export const staggerContainer: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

/**
 * Standard viewport config for scroll-triggered animations.
 * Ensures animations fire once and don't re-trigger on scroll-back,
 * per master_prompt.md's "animations should never slow navigation" rule.
 */
export const defaultViewport = { once: true, margin: "-80px" } as const;