export interface IUiRouter {
  navigateLogin(afterLoginPath?: string): Promise<boolean>;
}
