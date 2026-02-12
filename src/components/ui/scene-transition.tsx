import { AnimatePresence } from "motion/react";

/** Props for the {@link SceneTransition} wrapper component. */
type SceneTransitionProps = {
  readonly children: React.ReactNode;
};

/**
 * Sequential scene transition boundary.
 *
 * Wraps children in `AnimatePresence mode="wait"` to ensure the outgoing
 * scene fully exits before the incoming scene enters. Child `motion.*`
 * elements MUST carry a unique `key` prop to trigger the exit/enter lifecycle.
 */
function SceneTransition({ children }: SceneTransitionProps): React.ReactNode {
  return <AnimatePresence mode="wait">{children}</AnimatePresence>;
}

export { SceneTransition };
export type { SceneTransitionProps };
