.PHONY: build test clean install

build:
	go build -o terraform-provider-featuresignals

test:
	go test ./... -v -count=1 -timeout=120s

clean:
	rm -f terraform-provider-featuresignals

install: build
	mkdir -p ~/.terraform.d/plugins/registry.terraform.io/featuresignals/featuresignals/0.1.0/darwin_arm64
	cp terraform-provider-featuresignals ~/.terraform.d/plugins/registry.terraform.io/featuresignals/featuresignals/0.1.0/darwin_arm64/terraform-provider-featuresignals

.PHONY: vet
vet:
	go vet ./...

.PHONY: testacc
testacc:
	TF_ACC=1 go test ./... -v -count=1 -timeout=180s
