# Hoitsubotti
Hoitsubotti tarjoilee koronatilastoja telegramiin. Botin handler on @Hoitsubot, tai osoitteesta [https://t.me/Hoitsubot](https://t.me/Hoitsubot)

## Komennot

Hoitsu ymmärtää toistaseksi seuraavia komentoja

+ **stats** - Suomen koronatilastot
+ **doublingtime** - Tilasto tartuntojen tuplaantumisajan muutoksista (kirjoita komennon perään sairaanhoitopiirin nimi saadaksesi vain sen alueen tuplaantumisajan, esim */doublingtime HUS*)
+ **charts** - Kaavio päiväkohtaisista tartunnoista 30 päivän ajalta
+ **help** - Tietoja botista
+ **startupdates** - Vastaanota automaattisia viestejä uusista tartunnoista
+ **stopupdates** - Lopeta automaattisten viestien vastaanotto

## Tietoja

Botti toimii AWS:n Lambdan päällä ja tarvitsee toimiakseen yhteyden tietokantaan sekä Telegramin palvelimille asetetun webhookin.
