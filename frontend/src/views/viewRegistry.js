import ChatView from "./ChatView.jsx";
import ModelConfigView from "./ModelConfigView.jsx";
import OverviewView from "./OverviewView.jsx";
import PredictionView from "./PredictionView.jsx";
import ProfileView from "./ProfileView.jsx";
import ScenarioView from "./ScenarioView.jsx";
import UsageView from "./UsageView.jsx";

export const VIEW_COMPONENTS = {
  overview: OverviewView,
  profile: ProfileView,
  model: ModelConfigView,
  usage: UsageView,
  prediction: PredictionView,
  scenario: ScenarioView,
  chat: ChatView
};
