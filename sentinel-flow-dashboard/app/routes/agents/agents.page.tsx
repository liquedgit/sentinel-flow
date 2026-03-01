import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { Route } from "./+types/agents.page";
import CodeEditor from "~/components/code.editor";
import { createNewAgent, getAgents } from "~/.server/services/agents.service";
import { data, useFetcher, useLoaderData } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { BaseResponseDtoWithData } from "~/lib/types/dto/base.dto";
import type { Agent, IdentityMapping } from "~/lib/types/agent";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Edit,
  Eye,
  Terminal,
  Trash,
} from "lucide-react";
import { TerminalBlock } from "~/components/terminal.blocks";
import type { Agent as AgentClientType } from "~/lib/types/agent";
import { differenceInMinutes, formatDistanceToNow } from "date-fns";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";

export enum SidebarAgentType {
  SidebarAgentTypeCREATE = "CREATE",
  SidebarAgentTypeEDIT = "EDIT",
  SidebarAgentTypeDETAIL = "DETAIL",
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const agentName = String(formData.get("agentName"));
  const identityEndpoint = String(formData.get("identityEndpoint"));
  const backendBaseUrl = String(formData.get("backendBaseUrl"));
  const identityMapping = String(formData.get("identityMapping"));

  const agent = await createNewAgent(
    agentName,
    backendBaseUrl,
    identityEndpoint,
    identityMapping,
  );
  const res: BaseResponseDtoWithData<AgentClientType> = {
    data: {
      ...agent,
      identityMapping: JSON.parse(
        agent.identityMapping?.toString() || "{}",
      ) as IdentityMapping,
    },
    status: 201,
    success: true,
  };
  return data(res, { status: 201 });
}

export async function loader({ request }: Route.LoaderArgs) {
  const agents = await getAgents();
  return data(
    {
      data: [
        ...agents.map((agent) => ({
          ...agent,
          identityMapping: JSON.parse(
            agent.identityMapping?.toString() || "{}",
          ) as IdentityMapping,
        })),
      ],
      status: 200,
      success: true,
    } as BaseResponseDtoWithData<Omit<AgentClientType, "token">[]>,
    { status: 200 },
  );
}

export default function AgentsPage() {
  const [openType, setOpenedType] = useState<SidebarAgentType | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Omit<
    AgentClientType,
    "token"
  > | null>(null);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const { data: agents } =
    useLoaderData<BaseResponseDtoWithData<Omit<AgentClientType, "token">[]>>();

  // Form state for CREATE mode
  const [formData, setFormData] = useState({
    agentName: "production-collector-01",
    identityEndpoint: "https://identity.sentinelflow.io",
    backendBaseUrl: "https://api.sentinelflow.io",
    identityMapping: `{
  "userId": {
    "source": "identity_response",
    "path": "data.user.id",
    "required": true
  },
  "role": {
    "source": "identity_response", 
    "path": "data.user.role",
    "required": true
  },
  "permissions": {
    "source": "identity_response",
    "path": "data.user.permissions",
    "default": []
  }
}`,
  });

  const [createdAgent, setCreatedAgent] = useState<AgentClientType | null>(
    null,
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const generateInstallCommand = (agentData: AgentClientType) => {
    // Single line command to avoid wrapping issues
    // Still hardcoded for Sentinel flow Url
    // Later it will be migrated using the settings page
    return `curl -fsSL https://sentinelflow.liqued.cloud/install.sh | sh -s -- --token "${agentData.token}" --sentinel-flow-url "https://sentinel-flow.liqued.cloud"`;
  };

  const handleCopyCommand = () => {
    if (createdAgent) {
      const installCommand = generateInstallCommand(createdAgent);
      copyToClipboard(installCommand);
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    }
  };

  const renderForm = () => {
    return (
      <div className="space-y-6">
        {/* Agent Name */}
        <div className="space-y-2">
          <label className="text-white text-sm font-medium">Agent Name</label>
          <Input
            value={formData.agentName}
            onChange={(e) => handleInputChange("agentName", e.target.value)}
            className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
            disabled={
              openType !== SidebarAgentType.SidebarAgentTypeCREATE &&
              openType !== SidebarAgentType.SidebarAgentTypeEDIT
            }
          />
          <p className="text-gray-400 text-xs">
            Assign a unique name for identification in the dashboard.
          </p>
        </div>
        {/* Backend Base URL */}
        <div className="space-y-2">
          <label className="text-white text-sm font-medium">
            Backend Base URL
          </label>
          <Input
            value={formData.backendBaseUrl}
            onChange={(e) =>
              handleInputChange("backendBaseUrl", e.target.value)
            }
            className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
            disabled={
              openType !== SidebarAgentType.SidebarAgentTypeCREATE &&
              openType !== SidebarAgentType.SidebarAgentTypeEDIT
            }
          />
          <p className="text-gray-400 text-xs">
            Service backend base url for Reverse Proxy
          </p>
        </div>

        {/* Identity Endpoint */}
        <div className="space-y-2">
          <label className="text-white text-sm font-medium">
            Identity Endpoint
          </label>
          <Input
            value={formData.identityEndpoint}
            onChange={(e) =>
              handleInputChange("identityEndpoint", e.target.value)
            }
            className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
            disabled={
              openType !== SidebarAgentType.SidebarAgentTypeCREATE &&
              openType !== SidebarAgentType.SidebarAgentTypeEDIT
            }
          />
          <p className="text-gray-400 text-xs">
            The Endpoint where the agent will fetch user identities.
          </p>
        </div>

        {/* Identity Response Mapping - Code Editor Style */}
        <CodeEditor
          label="Identity Response Mapping"
          description="Define how to extract userId, role, and other fields from the identity verification response. Use JSONPath syntax for path definitions."
          placeholder={`{
            "userId": {
              "source": "identity_response",
              "path": "data.user.id"
            }
          }`}
          value={formData.identityMapping}
          onChange={(value) => handleInputChange("identityMapping", value)}
          disabled={
            openType !== SidebarAgentType.SidebarAgentTypeCREATE &&
            openType !== SidebarAgentType.SidebarAgentTypeEDIT
          }
        />

        {/* Helper Info Box */}
        {openType !== SidebarAgentType.SidebarAgentTypeDETAIL && (
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 space-y-2">
            <h4 className="text-blue-400 text-xs font-semibold uppercase tracking-wide">
              Configuration Guide
            </h4>
            <div className="space-y-1 text-xs text-gray-400">
              <p>
                <span className="text-gray-300">source:</span> Where to extract
                from (identity_response, headers)
              </p>
              <p>
                <span className="text-gray-300">path:</span> JSONPath to the
                field (e.g., data.user.role)
              </p>
              <p>
                <span className="text-gray-300">required:</span> Boolean - fail
                if field missing
              </p>

              <p>
                <span className="text-gray-300">default:</span> Fallback value
                if field not found
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDetailAgentPage = () => {
    const fetcherCreateAgent = useFetcher<BaseResponseDtoWithData<Agent>>();
    const submitAgentForm = async () => {
      const submitFormData = new FormData();
      submitFormData.append("agentName", formData.agentName);
      submitFormData.append("identityEndpoint", formData.identityEndpoint);
      submitFormData.append("backendBaseUrl", formData.backendBaseUrl);
      submitFormData.append("identityMapping", formData.identityMapping);

      if (openType == SidebarAgentType.SidebarAgentTypeCREATE) {
        fetcherCreateAgent.submit(submitFormData, {
          method: "POST",
        });
      }

      if (openType == SidebarAgentType.SidebarAgentTypeEDIT) {
        fetcherCreateAgent.submit(submitFormData, {
          method: "PATCH",
          action: `/agents/${selectedAgent?.id}`,
        });
      }
    };

    useEffect(() => {
      if (fetcherCreateAgent.data && fetcherCreateAgent.data.success) {
        const data: BaseResponseDtoWithData<Agent> = fetcherCreateAgent.data;
        if (openType == SidebarAgentType.SidebarAgentTypeCREATE) {
          setCreatedAgent(data.data);
        }
        if (openType == SidebarAgentType.SidebarAgentTypeEDIT) {
          toast.success(`Agent ${selectedAgent?.name}  updated successfully`);
          setSelectedAgent(null);
          setOpenedType(null);
        }
      }
    }, [fetcherCreateAgent.data]);

    return (
      <Sheet open={openType != null} onOpenChange={() => setOpenedType(null)}>
        <SheetContent
          className="bg-primary-foreground border-primary  flex flex-col h-full"
          showCloseButton={false}
          side="right"
        >
          <div className="flex-shrink-0 border-b border-primary">
            <SheetHeader>
              <SheetTitle className="text-white">
                {openType == SidebarAgentType.SidebarAgentTypeCREATE ? (
                  <>Deploy New Agent</>
                ) : (
                  <>
                    {openType == SidebarAgentType.SidebarAgentTypeEDIT &&
                      selectedAgent != null && (
                        <>Editing Agent {selectedAgent.name}</>
                      )}
                    {openType == SidebarAgentType.SidebarAgentTypeDETAIL &&
                      selectedAgent != null && (
                        <>Viewing Agent {selectedAgent.name}</>
                      )}
                  </>
                )}
              </SheetTitle>
              {(openType == SidebarAgentType.SidebarAgentTypeEDIT ||
                openType == SidebarAgentType.SidebarAgentTypeDETAIL) &&
                selectedAgent != null && (
                  <>
                    <SheetDescription>
                      <div className="font-bold">ID : {selectedAgent.id}</div>
                    </SheetDescription>
                  </>
                )}
            </SheetHeader>
          </div>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="text-white space-y-4">
              <div className="p-6">{renderForm()}</div>
            </div>
          </ScrollArea>
          {/* Footer Actions */}
          {openType === SidebarAgentType.SidebarAgentTypeCREATE && (
            <div className="flex-shrink-0 p-6">
              <Button
                className="w-full bg-active-primary hover:bg-active-primary/50 text-white font-medium py-3 rounded-lg transition-colors"
                onClick={() => {
                  // Handle generate installation command
                  submitAgentForm();
                }}
                disabled={fetcherCreateAgent.state !== "idle"}
              >
                {fetcherCreateAgent.state !== "idle"
                  ? "Generating..."
                  : "Generate Installation Command"}
              </Button>
            </div>
          )}
          {openType == SidebarAgentType.SidebarAgentTypeEDIT && (
            <div className="flex-shrink-0 p-6">
              <Button
                className="w-full bg-active-primary hover:bg-active-primary/50 text-white font-medium py-3 rounded-lg transition-colors"
                onClick={() => {
                  // Handle generate installation command
                  submitAgentForm();
                }}
              >
                Edit Agent
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  };

  const [selectedAgentToDelete, setSelectedAgentToDelete] = useState<Omit<
    AgentClientType,
    "token"
  > | null>(null);

  const renderDialogWarningDeleteAgent = () => {
    const [agentNameToDelete, setAgentNameToDelete] = useState<string>("");
    const fetcherDeleteAgent = useFetcher<BaseResponseDtoWithData<Agent>>();

    const handleDeleteAgent = () => {
      if (
        selectedAgentToDelete &&
        agentNameToDelete === selectedAgentToDelete?.name
      ) {
        fetcherDeleteAgent.submit(null, {
          method: "DELETE",
          action: `/agents/${selectedAgentToDelete.id}`,
        });
      }
    };

    useEffect(() => {
      if (fetcherDeleteAgent.data && fetcherDeleteAgent.data.success) {
        setSelectedAgentToDelete(null);
      }
    }, [fetcherDeleteAgent.data]);

    return (
      <Dialog
        open={selectedAgentToDelete != null}
        onOpenChange={() => setSelectedAgentToDelete(null)}
      >
        <DialogContent className="bg-primary-foreground border-primary">
          <DialogHeader>
            <DialogTitle>
              Delete Agent {selectedAgentToDelete?.name}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this agent? This action is
              irreversible. Please type the agent name to confirm.
            </DialogDescription>
            <div>
              <Input
                value={agentNameToDelete}
                onChange={(e) => setAgentNameToDelete(e.target.value)}
                placeholder={selectedAgentToDelete?.name}
                className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
              />
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="bg-red-400 hover:bg-red-400/50 text-white"
              onClick={handleDeleteAgent}
              disabled={fetcherDeleteAgent.state !== "idle"}
            >
              {fetcherDeleteAgent.state !== "idle" ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderSuccessDialogCreateAgent = () => {
    if (!createdAgent) return null;

    return (
      <Dialog
        open={createdAgent != null}
        onOpenChange={(open) => !open && setCreatedAgent(null)}
      >
        <DialogContent className="bg-gray-950 border-gray-800 text-white sm:max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] p-0 gap-0 overflow-hidden">
          {/* Fixed Header */}
          <div className="p-6 border-b border-gray-800 bg-gray-950">
            <DialogHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-xl text-white text-left">
                    Agent Successfully Created
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 text-left">
                    Your agent{" "}
                    <span className="text-blue-400 font-mono">
                      {createdAgent.name}
                    </span>{" "}
                    is ready for deployment
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="max-h-[calc(90vh-200px)]">
            <div className="p-6 space-y-6">
              {/* Installation Command */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Terminal size={16} className="text-blue-400" />
                    Installation Command
                  </h3>
                </div>

                <TerminalBlock
                  command={generateInstallCommand(createdAgent)}
                  onCopy={handleCopyCommand}
                  copied={copiedCommand}
                />
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle
                  size={16}
                  className="text-yellow-500 mt-0.5 flex-shrink-0"
                />
                <div className="text-xs text-gray-400">
                  <span className="text-yellow-500 font-semibold">
                    Security Note:
                  </span>{" "}
                  The installation command contains your agent token. Store it
                  securely and avoid sharing it. This command is only generated
                  once.
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="p-4 space-y-5">
      {/* Headings */}
      <div className="flex justify-between">
        <div className="space-x-2">
          <h1 className="text-white font-bold text-2xl">Managed Agents</h1>
          <p>
            Centralized control for data collection across your legacy
            infrastructure.
          </p>
        </div>
        <div className="flex items-center">
          <Button
            className="bg-active-primary hover:bg-active-primary/50 text-white"
            onClick={() => {
              setOpenedType(SidebarAgentType.SidebarAgentTypeCREATE);
            }}
          >
            Deploy New Agent
          </Button>
        </div>
      </div>
      {/* Body */}
      <div className="space-y-4">
        {/* Filter and Search */}
        <div>
          <div className="w-1/4">
            <Input
              placeholder="Search agents by name, ID, or IP address"
              className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-primary">
          <Table className="bg-primary-foreground text-white">
            <TableHeader>
              <TableRow>
                <TableHead>Agent ID</TableHead>
                <TableHead>Agent name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Heartbeat</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents?.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>{agent.id}</TableCell>
                  <TableCell>{agent.name}</TableCell>
                  <TableCell>
                    {agent.lastHeartbeat ? (
                      differenceInMinutes(agent.lastHeartbeat, new Date()) <
                      -5 ? (
                        <Badge
                          variant="outline"
                          className="bg-red-400 text-white border-red-400"
                        >
                          Offline{" "}
                          {differenceInMinutes(
                            agent.lastHeartbeat,
                            new Date(),
                          ) > 5}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-green-400 text-white border-green-400"
                        >
                          Online{" "}
                          {differenceInMinutes(
                            agent.lastHeartbeat,
                            new Date(),
                          ) > 5}
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {agent.lastHeartbeat
                      ? formatDistanceToNow(new Date(agent.lastHeartbeat), {
                          addSuffix: true,
                        })
                      : "N/A"}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      className="bg-active-primary hover:bg-active-primary/50 text-white"
                      onClick={() => {
                        setFormData({
                          agentName: agent.name,
                          identityEndpoint: agent.identityEndpoint,
                          backendBaseUrl: agent.backendBaseUrl,
                          identityMapping: JSON.stringify(
                            agent.identityMapping,
                          ),
                        });
                        setSelectedAgent(agent);
                        setOpenedType(SidebarAgentType.SidebarAgentTypeDETAIL);
                      }}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      className="bg-active-primary hover:bg-active-primary/50 text-white"
                      onClick={() => {
                        setFormData({
                          agentName: agent.name,
                          identityEndpoint: agent.identityEndpoint,
                          backendBaseUrl: agent.backendBaseUrl,
                          identityMapping: JSON.stringify(
                            agent.identityMapping,
                          ),
                        });
                        setSelectedAgent(agent);
                        setOpenedType(SidebarAgentType.SidebarAgentTypeEDIT);
                      }}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      className="bg-red-400 hover:bg-red-400/50 text-white"
                      onClick={() => setSelectedAgentToDelete(agent)}
                    >
                      <Trash size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderDetailAgentPage()}
        {renderSuccessDialogCreateAgent()}
        {renderDialogWarningDeleteAgent()}
      </div>
    </div>
  );
}
