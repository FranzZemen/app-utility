# Execution Context
The Execution Context _ExecutionContextI_ is used throughout @franzzemen packages as an optional parameter, usually 
the last on a function invocation, to carry execution context.  This context includes the following definitions:

- The application context _appContext_ which identifies the application invoking the code:  This is not the package 
  name, but rather the overall application which is an arbitrary value. For instance, if an application was called 
  "Folio", then the appContext value would be 'Folio', and that context would be carried throughout the packages that 
  support it.  That can be useful in many ways - lets say a AWS Lambda supports many applications, but logs to a 
  common destination in Cloudwatch.  The application context provides an ability to distinguish the logs by usage.  
  This is entirely in the control of the source system/client software.
- The thread:  Well, we all know Javascript is single threaded; this is not the machine thread.  This represents the 
  thread of logic.  Just as the application context carries which application is current, the thread identifies the 
  successive jumps from component to component.  Let's say that we have three Lambdas ALambda, BLambda and CLambda, 
  each called in succession.  When the code is executing in ALambda, the thread will have value 'ALambda'.  When in 
  BLambda, it will have value 'ALambda->BLambda', since the call originates in ALambda.  And in CLambda the value 
  would be 'ALambda->BLambda->CLambda'.  This is illustrative only; additional information is embedded in the thread,
  but this is the central concept.  It enabled tracing not just between, say Lambdas for which there exists 
  solutions, but throughout @franzzemen components as they interact.  Note that in web/mobile apps the thread of 
  execution can start in the client, making it a very powerful connector between client and server side logic.  If 
  the source system provides a value, further values will be appended.  To be populated, it needs to traverse 
  deployed components from the @franzzemen environment - not just usage of the libraries.
- The request Id:  This is a unique id that is assigned when a request begins within a specific synchronous stack - 
  typically an entry point to Lambda, EC2 etc. To be populated, it needs to traverse
  deployed components from the @franzzemen environment - not just usage of the libraries.
- The authorization:  Usually the bearer token or some other alias for an authorization (never a username or 
  password!) that will be used to evaluate access against roles.  To be populated, it needs to traverse
  deployed components from the @franzzemen environment - not just usage of the libraries.  
- The config:  Probably the most powerful option, this provides configuration options that survive restarts.  For 
  most users initially this will be the logger adapter configurations.
