import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import healthRouter from "./health";
import authRouter from "./auth";
import ocRouter from "./oc";
import ordersRouter from "./orders";
import fleetRouter from "./fleet";
import schedulesRouter from "./schedules";
import lotesRouter from "./lotes";
import muralRouter from "./mural";
import sysusersRouter from "./sysusers";
import filiaisRouter from "./filiais";
import loteHistoryRouter from "./loteHistory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ocRouter);

router.use(requireAuth);

router.use(ordersRouter);
router.use(fleetRouter);
router.use(schedulesRouter);
router.use(lotesRouter);
router.use(muralRouter);
router.use(sysusersRouter);
router.use(filiaisRouter);
router.use(loteHistoryRouter);

export default router;
