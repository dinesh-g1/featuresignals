package main

import (
	"context"
	"flag"
	"log"

	"github.com/featuresignals/terraform-provider-featuresignals/internal/provider"
	"github.com/hashicorp/terraform-plugin-framework/providerserver"
	tfprovider "github.com/hashicorp/terraform-plugin-framework/provider"
)

func main() {
	var debug bool

	flag.BoolVar(&debug, "debug", false, "set to true to run the provider with support for debuggers like delve")
	flag.Parse()

	opts := providerserver.ServeOpts{
		Address: "registry.terraform.io/featuresignals/featuresignals",
		Debug:   debug,
	}

	err := providerserver.Serve(context.Background(), func() tfprovider.Provider { return provider.New() }, opts)
	if err != nil {
		log.Fatal(err)
	}
}