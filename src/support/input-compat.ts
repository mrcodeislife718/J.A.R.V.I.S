import type {
  CreateSupportActionInput,
  CreateSupportCustomerInput,
  CreateSupportPlaybookInput,
  CreateSupportPolicyInput,
  CreateSupportProductInput,
  CreateSupportTicketInput,
  CreateSupportWorkspaceInput,
} from "./service.js";
import type {
  SupportAction,
  SupportCustomer,
  SupportPlaybook,
  SupportPolicy,
  SupportProduct,
  SupportTicket,
  SupportWorkspace,
} from "./types.js";

type ExplicitOptional<T> = {
  [Key in keyof T]: undefined extends T[Key] ? T[Key] | undefined : T[Key];
};

declare module "./service.js" {
  interface SupportService {
    createWorkspace(input: ExplicitOptional<CreateSupportWorkspaceInput>): Promise<SupportWorkspace>;
    createCustomer(input: ExplicitOptional<CreateSupportCustomerInput>): Promise<SupportCustomer>;
    createProduct(input: ExplicitOptional<CreateSupportProductInput>): Promise<SupportProduct>;
    createPolicy(input: ExplicitOptional<CreateSupportPolicyInput>): Promise<SupportPolicy>;
    createPlaybook(input: ExplicitOptional<CreateSupportPlaybookInput>): Promise<SupportPlaybook>;
    createTicket(input: ExplicitOptional<CreateSupportTicketInput>): Promise<SupportTicket>;
    createAction(input: ExplicitOptional<CreateSupportActionInput>): Promise<SupportAction>;
  }
}
